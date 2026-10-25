import pytest
from tests.helpers import setup_system, get_auth_header, create_hr_user, setup_org_structure

def test_func_03_company_settings(client):
    """
    Functionality 03:
    - View company settings (hours, grace period, weekend days, geofence radius)
    - Admin updates company settings
    - HR cannot edit company settings (RBAC 403)
    """
    admin_auth = setup_system(client)
    admin_headers = get_auth_header(admin_auth["access_token"])
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    hr_headers = get_auth_header(hr_auth["access_token"])

    # 1. View settings
    get_res = client.get("/api/org/settings", headers=admin_headers)
    assert get_res.status_code == 200
    settings = get_res.json()
    assert settings["company_name"] == "Saylani Tech Solutions"
    assert settings["office_start"] == "09:00"
    assert settings["grace_time_minutes"] == 15
    assert settings["office_radius_meters"] == 150.0

    # 2. Admin edits settings
    update_res = client.put("/api/org/settings", headers=admin_headers, json={
        "office_start": "09:30",
        "grace_time_minutes": 20,
        "office_radius_meters": 200.0,
        "weekend_days": "Sunday"
    })
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["office_start"] == "09:30"
    assert updated["grace_time_minutes"] == 20
    assert updated["office_radius_meters"] == 200.0
    assert updated["weekend_days"] == "Sunday"

    # 3. HR tries to edit settings -> Forbidden (403)
    hr_edit_res = client.put("/api/org/settings", headers=hr_headers, json={
        "grace_time_minutes": 30
    })
    assert hr_edit_res.status_code == 403

def test_func_04_org_structure_and_holidays(client):
    """
    Functionality 04:
    - Departments: Create and list, reject duplicates
    - Designations: Create and link to department
    - Leave types & quotas: Seeded defaults present, add custom leave type
    - Public Holidays: Add and list holidays, reject duplicate date
    """
    admin_auth = setup_system(client)
    admin_headers = get_auth_header(admin_auth["access_token"])

    # 1. Create Department
    dept_res = client.post("/api/org/departments", headers=admin_headers, json={
        "name": "Engineering",
        "code": "ENG"
    })
    assert dept_res.status_code == 200
    dept_id = dept_res.json()["id"]

    # Reject duplicate department code/name
    dup_dept = client.post("/api/org/departments", headers=admin_headers, json={
        "name": "Engineering",
        "code": "ENG2"
    })
    assert dup_dept.status_code == 400

    # List departments
    list_dept = client.get("/api/org/departments", headers=admin_headers)
    assert list_dept.status_code == 200
    assert any(d["code"] == "ENG" for d in list_dept.json())

    # 2. Create Designation
    desig_res = client.post("/api/org/designations", headers=admin_headers, json={
        "title": "Senior Backend Developer",
        "department_id": dept_id
    })
    assert desig_res.status_code == 200
    desig_data = desig_res.json()
    assert desig_data["title"] == "Senior Backend Developer"
    assert desig_data["department_name"] == "Engineering"

    # List designations
    list_desig = client.get("/api/org/designations", headers=admin_headers)
    assert list_desig.status_code == 200
    assert len(list_desig.json()) >= 1

    # 3. Leave types (seeded defaults + custom)
    lt_res = client.get("/api/org/leave-types", headers=admin_headers)
    assert lt_res.status_code == 200
    leave_types = {lt["name"]: lt["quota"] for lt in lt_res.json()}
    assert "Annual Leave" in leave_types
    assert leave_types["Annual Leave"] == 14
    assert leave_types["Sick Leave"] == 8
    assert leave_types["Casual Leave"] == 10

    # Add custom leave type
    custom_lt = client.post("/api/org/leave-types", headers=admin_headers, json={
        "name": "Paternity Leave",
        "quota": 5
    })
    assert custom_lt.status_code == 200
    assert custom_lt.json()["name"] == "Paternity Leave"
    assert custom_lt.json()["quota"] == 5

    # 4. Public Holidays
    hol_res = client.post("/api/org/holidays", headers=admin_headers, json={
        "name": "Pakistan Day",
        "date": "2026-03-23"
    })
    assert hol_res.status_code == 200
    assert hol_res.json()["name"] == "Pakistan Day"
    assert hol_res.json()["date"] == "2026-03-23"

    # Duplicate date rejected
    dup_hol = client.post("/api/org/holidays", headers=admin_headers, json={
        "name": "Another Holiday",
        "date": "2026-03-23"
    })
    assert dup_hol.status_code == 400

    # List holidays
    list_hol = client.get("/api/org/holidays", headers=admin_headers)
    assert list_hol.status_code == 200
    assert any(h["name"] == "Pakistan Day" for h in list_hol.json())
