import pytest
from tests.helpers import (
    setup_system, get_auth_header, create_hr_user,
    setup_org_structure, create_employee_and_login
)

def test_func_12_apply_and_cancel_leave(client):
    """
    Functionality 12:
    - View leave balances (seeded default quotas)
    - Apply for leave (skips weekends and public holidays)
    - Rejects overlapping leave request (HTTP 422)
    - Rejects request exceeding available quota (HTTP 422)
    - Employee cancels own pending leave request
    """
    admin_auth = setup_system(client)
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])
    emp_data, emp_login = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="leave_emp@hcmlite.com", code="EMP-LV-1"
    )
    emp_headers = get_auth_header(emp_login["access_token"])

    # 1. Check initial balances
    bal_res = client.get("/api/leave/balances", headers=emp_headers)
    assert bal_res.status_code == 200
    balances = {b["name"]: b for b in bal_res.json()}
    casual_lt = balances["Casual Leave"]
    assert casual_lt["quota"] == 10
    assert casual_lt["remaining"] == 10
    casual_id = casual_lt["leave_type_id"]

    # 2. Add public holiday on 2026-11-04 (Wednesday) to test holiday exclusion
    client.post(
        "/api/org/holidays",
        headers=get_auth_header(admin_auth["access_token"]),
        json={"name": "Midweek Holiday", "date": "2026-11-04"}
    )

    # 2026-11-02 (Monday) to 2026-11-08 (Sunday):
    # Mon, Tue, Wed (holiday!), Thu, Fri, Sat (weekend!), Sun (weekend!)
    # Working days should be 4 days (Mon, Tue, Thu, Fri), NOT 7!
    apply_res = client.post("/api/leave/apply", headers=emp_headers, json={
        "leave_type_id": casual_id,
        "start_date": "2026-11-02",
        "end_date": "2026-11-08",
        "reason": "Family vacation"
    })
    assert apply_res.status_code == 200
    leave_app = apply_res.json()
    assert leave_app["status"] == "PENDING"
    assert leave_app["working_days"] == 4.0
    leave_id = leave_app["id"]

    # 3. Overlapping request should be rejected with HTTP 422
    overlap_res = client.post("/api/leave/apply", headers=emp_headers, json={
        "leave_type_id": casual_id,
        "start_date": "2026-11-05",
        "end_date": "2026-11-06",
        "reason": "Overlap test"
    })
    assert overlap_res.status_code == 422

    # 4. Exceeding quota rejected (e.g. asking for 20 days when quota is 10)
    over_res = client.post("/api/leave/apply", headers=emp_headers, json={
        "leave_type_id": casual_id,
        "start_date": "2026-12-01",
        "end_date": "2026-12-31",
        "reason": "Exceeding quota"
    })
    assert over_res.status_code == 422

    # 5. Cancel own leave request
    cancel_res = client.post(f"/api/leave/{leave_id}/cancel", headers=emp_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

def test_func_13_hr_leave_approval_and_rejection(client):
    """
    Functionality 13:
    - Employee submits leave request
    - HR views inbox
    - HR approves leave request with comment -> balance is deducted
    - HR rejects leave request with comment -> balance not deducted
    """
    admin_auth = setup_system(client)
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    hr_headers = get_auth_header(hr_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])
    emp_data, emp_login = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="hr_review_emp@hcmlite.com", code="EMP-LV-2"
    )
    emp_headers = get_auth_header(emp_login["access_token"])

    bal_res = client.get("/api/leave/balances", headers=emp_headers)
    balances = {b["name"]: b for b in bal_res.json()}
    sick_lt = balances["Sick Leave"]
    sick_id = sick_lt["leave_type_id"]

    # 1. Employee submits 2-day sick leave (e.g. Tuesday to Wednesday)
    apply_res = client.post("/api/leave/apply", headers=emp_headers, json={
        "leave_type_id": sick_id,
        "start_date": "2026-11-10",
        "end_date": "2026-11-11",
        "reason": "Doctor appointment and rest"
    })
    assert apply_res.status_code == 200
    leave_id = apply_res.json()["id"]

    # 2. HR sees request in inbox
    inbox_res = client.get("/api/leave/inbox", headers=hr_headers)
    assert inbox_res.status_code == 200
    assert any(item["id"] == leave_id for item in inbox_res.json())

    # 3. HR approves leave request
    review_res = client.post(f"/api/leave/{leave_id}/review", headers=hr_headers, json={
        "status": "APPROVED",
        "reviewer_comment": "Get well soon, approved."
    })
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "APPROVED"
    assert review_res.json()["reviewer_comment"] == "Get well soon, approved."

    # 4. Check that balance is deducted (8 quota - 2 used = 6 remaining)
    bal_res2 = client.get("/api/leave/balances", headers=emp_headers)
    balances2 = {b["name"]: b for b in bal_res2.json()}
    assert balances2["Sick Leave"]["used"] == 2.0
    assert balances2["Sick Leave"]["remaining"] == 6.0

    # 5. Test rejection: Employee submits another leave request, HR rejects it
    apply_res2 = client.post("/api/leave/apply", headers=emp_headers, json={
        "leave_type_id": sick_id,
        "start_date": "2026-11-17",
        "end_date": "2026-11-18",
        "reason": "Extra rest"
    })
    leave_id2 = apply_res2.json()["id"]

    reject_res = client.post(f"/api/leave/{leave_id2}/review", headers=hr_headers, json={
        "status": "REJECTED",
        "reviewer_comment": "Critical deployment scheduled; please reschedule."
    })
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "REJECTED"

    # Balance still remains 6 (rejected leave does not deduct balance)
    bal_res3 = client.get("/api/leave/balances", headers=emp_headers)
    balances3 = {b["name"]: b for b in bal_res3.json()}
    assert balances3["Sick Leave"]["remaining"] == 6.0
