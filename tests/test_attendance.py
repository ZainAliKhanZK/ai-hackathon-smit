from datetime import datetime
import pytest
from tests.helpers import (
    setup_system, get_auth_header, create_hr_user,
    setup_org_structure, create_employee_and_login
)

def test_func_09_check_in_check_out_and_duplicate(client):
    """
    Functionality 09:
    - Employee web check-in (server stamps time)
    - Second check-in on same day is rejected with HTTP 409 Conflict
    - Employee check-out (calculates hours, clears missing_checkout)
    """
    admin_auth = setup_system(client)
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])
    emp_data, emp_login = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="attendee@hcmlite.com", code="EMP-ATT-1"
    )
    emp_headers = get_auth_header(emp_login["access_token"])

    # 1. First check-in succeeds
    check_in_res = client.post("/api/attendance/check-in", headers=emp_headers, json={
        "source": "WEB"
    })
    assert check_in_res.status_code == 200
    att = check_in_res.json()
    assert att["check_in"] is not None
    assert att["missing_checkout"] is True
    assert att["status"] in ["PRESENT", "LATE"]

    # 2. Second check-in MUST be rejected with HTTP 409 Conflict
    dup_res = client.post("/api/attendance/check-in", headers=emp_headers, json={
        "source": "WEB"
    })
    assert dup_res.status_code == 409
    assert "already checked in" in dup_res.json()["detail"].lower()

    # 3. Check-out succeeds
    check_out_res = client.post("/api/attendance/check-out", headers=emp_headers, json={})
    assert check_out_res.status_code == 200
    out_att = check_out_res.json()
    assert out_att["check_out"] is not None
    assert out_att["missing_checkout"] is False
    assert out_att["total_hours"] >= 0.0

def test_bonus_geofence_verification(client):
    """
    Bonus Feature:
    - Haversine geofence verification
    - Check-in within 150m radius succeeds with location_verified=True
    - Check-in outside 150m radius is rejected with HTTP 400 Bad Request
    """
    admin_auth = setup_system(client)
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])
    emp_data, emp_login = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="geo_emp@hcmlite.com", code="EMP-GEO-1"
    )
    emp_headers = get_auth_header(emp_login["access_token"])

    # Outside office radius (e.g. 50 km away)
    far_res = client.post("/api/attendance/check-in", headers=emp_headers, json={
        "source": "CAMERA",
        "latitude": 25.3960,  # Hyderabad, Sindh
        "longitude": 68.3578,
        "accuracy": 15.0
    })
    assert far_res.status_code == 400
    assert "geofence" in far_res.json()["detail"].lower()

    # Inside office radius (near 24.8607, 67.0011)
    near_res = client.post("/api/attendance/check-in", headers=emp_headers, json={
        "source": "CAMERA",
        "latitude": 24.8608,
        "longitude": 67.0012,
        "accuracy": 10.0
    })
    assert near_res.status_code == 200
    assert near_res.json()["location_verified"] is True

def test_func_10_attendance_board_and_calendar(client):
    """
    Functionality 10:
    - Daily attendance board shows all employees who checked in today
    - Attendance calendar retrieves history for given month
    """
    admin_auth = setup_system(client)
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])
    emp_data, emp_login = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="board_emp@hcmlite.com", code="EMP-BRD-1"
    )
    emp_headers = get_auth_header(emp_login["access_token"])
    hr_headers = get_auth_header(hr_auth["access_token"])

    # Check in
    client.post("/api/attendance/check-in", headers=emp_headers, json={"source": "WEB"})

    # 1. Daily Board
    board_res = client.get("/api/attendance/today", headers=hr_headers)
    assert board_res.status_code == 200
    records = board_res.json()
    assert len(records) >= 1
    assert any(r["employee_code"] == "EMP-BRD-1" for r in records)

    # 2. Calendar view
    current_month = datetime.now().strftime("%Y-%m")
    cal_res = client.get(f"/api/attendance/calendar?month={current_month}", headers=emp_headers)
    assert cal_res.status_code == 200
    cal_records = cal_res.json()
    assert len(cal_records) >= 1

def test_func_11_attendance_correction_workflow(client):
    """
    Functionality 11:
    - Employee requests attendance correction with reason
    - Correction is listed
    - HR reviews and approves correction with comment
    - Attendance record is updated with corrected times
    """
    admin_auth = setup_system(client)
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    hr_headers = get_auth_header(hr_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])
    emp_data, emp_login = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="corr_emp@hcmlite.com", code="EMP-CORR-1"
    )
    emp_headers = get_auth_header(emp_login["access_token"])

    today_str = datetime.now().strftime("%Y-%m-%d")

    # 1. Employee submits correction request
    corr_res = client.post("/api/attendance/correction", headers=emp_headers, json={
        "date": today_str,
        "requested_check_in": "09:00:00",
        "requested_check_out": "17:00:00",
        "reason": "Forgot badge at home, was present all day."
    })
    assert corr_res.status_code == 200
    corr_data = corr_res.json()
    corr_id = corr_data["id"]
    assert corr_data["status"] == "PENDING"

    # 2. List corrections
    list_res = client.get("/api/attendance/corrections", headers=hr_headers)
    assert list_res.status_code == 200
    assert any(c["id"] == corr_id for c in list_res.json())

    # 3. HR reviews and approves correction
    review_res = client.post(f"/api/attendance/corrections/{corr_id}/review", headers=hr_headers, json={
        "status": "APPROVED",
        "reviewer_comment": "Verified with team lead, approved."
    })
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "APPROVED"

    # 4. Verify updated attendance record
    board_res = client.get(f"/api/attendance/today?date_str={today_str}", headers=hr_headers)
    assert board_res.status_code == 200
    att_rec = next(r for r in board_res.json() if r["employee_id"] == emp_data["employee_id"])
    assert att_rec["check_in"] == "09:00:00"
    assert att_rec["check_out"] == "17:00:00"
    assert att_rec["total_hours"] == 8.0
    assert att_rec["status"] == "PRESENT"
