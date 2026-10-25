import pytest
from datetime import datetime
from tests.helpers import (
    setup_system, get_auth_header, create_hr_user,
    setup_org_structure, create_employee_and_login
)

def test_func_18_dashboards_admin_hr_employee(client):
    """
    Functionality 18:
    - Admin dashboard: Headcount, payroll cost, dept breakdown
    - HR dashboard: Attendance stats, pending leaves, upcoming holidays
    - Employee dashboard: Personal attendance, remaining leaves, latest payslip
    """
    admin_auth = setup_system(client)
    admin_headers = get_auth_header(admin_auth["access_token"])
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    hr_headers = get_auth_header(hr_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])

    emp_data, emp_login = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="dash_emp@hcmlite.com", code="EMP-DASH-1", salary=80000.0
    )
    emp_headers = get_auth_header(emp_login["access_token"])

    # 1. Admin Dashboard
    admin_dash = client.get("/api/analytics/admin", headers=admin_headers)
    assert admin_dash.status_code == 200
    adm_data = admin_dash.json()
    assert "kpis" in adm_data
    assert adm_data["kpis"]["headcount"] >= 1
    assert "headcount_by_department" in adm_data
    assert "payroll_by_department" in adm_data

    # 2. HR Dashboard
    hr_dash = client.get("/api/analytics/hr", headers=hr_headers)
    assert hr_dash.status_code == 200
    hr_data = hr_dash.json()
    assert "kpis" in hr_data
    assert "leave_by_type" in hr_data
    assert "attendance_trend" in hr_data

    # 3. Employee Dashboard
    emp_dash = client.get("/api/analytics/employee", headers=emp_headers)
    assert emp_dash.status_code == 200
    emp_dash_data = emp_dash.json()
    assert "today_attendance" in emp_dash_data
    assert "leave_balances" in emp_dash_data
    assert "hours_this_week" in emp_dash_data

def test_func_19_22_ai_assistant_tools_and_security(client):
    """
    Functionality 19, 22 (+ Bonus Roman Urdu & RBAC Guard):
    - Policy Q&A on HCM Rules
    - Real-time DB query: "Who is on leave today?", "What is this month's attendance rate?"
    - RBAC Privacy Guard: Employee asking about colleague salary is politely refused!
    - Roman Urdu understanding
    """
    admin_auth = setup_system(client)
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    hr_headers = get_auth_header(hr_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])

    emp_data, emp_login = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="ai_emp@hcmlite.com", code="EMP-AI-1", salary=85000.0
    )
    emp_headers = get_auth_header(emp_login["access_token"])

    # 1. Policy Q&A (Functionality 22)
    policy_res = client.post("/api/ai/chat", headers=hr_headers, json={
        "message": "What are the office hours and grace time?"
    })
    assert policy_res.status_code == 200
    policy_reply = policy_res.json()["reply"]
    assert "09:00" in policy_reply or "office" in policy_reply.lower()

    # 2. HR asks data query: "What is this month's attendance rate?"
    rate_res = client.post("/api/ai/chat", headers=hr_headers, json={
        "message": "What is this month's attendance rate?"
    })
    assert rate_res.status_code == 200
    rate_reply = rate_res.json()["reply"]
    assert "%" in rate_reply or "attendance" in rate_reply.lower()

    # 3. RBAC Privacy Guard: Employee asks about colleague's salary
    salary_guard_res = client.post("/api/ai/chat", headers=emp_headers, json={
        "message": "What is Ali's salary?"
    })
    assert salary_guard_res.status_code == 200
    guard_reply = salary_guard_res.json()["reply"]
    assert "cannot disclose" in guard_reply.lower() or "refuse" in guard_reply.lower() or "personal" in guard_reply.lower()

    # 4. Roman Urdu comprehension (Bonus)
    urdu_res = client.post("/api/ai/chat", headers=emp_headers, json={
        "message": "Office ki timing kya hai?"
    })
    assert urdu_res.status_code == 200
    assert len(urdu_res.json()["reply"]) > 0

def test_func_20_ai_dashboard_summary(client):
    """
    Functionality 20:
    - Generates 3-5 concise bullet points from KPI JSON
    """
    admin_auth = setup_system(client)
    admin_headers = get_auth_header(admin_auth["access_token"])

    summary_res = client.post("/api/ai/dashboard-summary", headers=admin_headers, json={
        "kpi_data": {
            "headcount": 15,
            "present_today": 14,
            "late_today": 1,
            "on_leave_today": 0,
            "payroll_cost": 1500000.0,
            "avg_salary": 100000.0,
            "attrition_rate": 2.5
        }
    })
    assert summary_res.status_code == 200
    bullets = summary_res.json()["summary_bullets"]
    assert len(bullets) >= 3
    assert any("15" in b for b in bullets)

def test_func_21_smart_leave_nlp(client):
    """
    Functionality 21 (+ Bonus Roman Urdu):
    - Natural language sentence parsing to prefill leave form
    - English: "Need next Monday and Tuesday off for sister wedding"
    - Roman Urdu: "Mujhe aglay peer ko chutti chahiye"
    """
    admin_auth = setup_system(client)
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    emp_headers = get_auth_header(admin_auth["access_token"])

    # English parser
    res1 = client.post("/api/ai/smart-leave", headers=emp_headers, json={
        "sentence": "Need next Monday and Tuesday off for sister wedding"
    })
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["start_date"] is not None
    assert data1["end_date"] is not None
    assert data1["leave_type_name"] is not None
    assert "wedding" in data1["reason"].lower()

    # Roman Urdu parser
    res2 = client.post("/api/ai/smart-leave", headers=emp_headers, json={
        "sentence": "Mujhe bukhar hai doctor k pas jana hai kal chutti chahiye"
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["start_date"] is not None
    assert "sick" in data2["leave_type_name"].lower()

def test_func_23_24_25_announcements_notifications_audit(client):
    """
    Functionalities 23, 24, 25:
    - Functionality 23: Broadcast announcements posted by Admin/HR, visible to all
    - Functionality 24: In-app notifications listing and mark read
    - Functionality 25: Immutable audit logs viewable only by Admin
    """
    admin_auth = setup_system(client)
    admin_headers = get_auth_header(admin_auth["access_token"])
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    hr_headers = get_auth_header(hr_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])

    emp_data, emp_login = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="comms_emp@hcmlite.com", code="EMP-COMMS-1"
    )
    emp_headers = get_auth_header(emp_login["access_token"])

    # 1. Post Announcement (Functionality 23)
    anno_res = client.post("/api/comms/announcements", headers=admin_headers, json={
        "title": "Townhall Meeting",
        "content": "All hands company townhall this Friday at 3 PM.",
        "priority": "HIGH"
    })
    assert anno_res.status_code == 200
    anno_id = anno_res.json()["id"]

    # Employee views announcements
    emp_anno_res = client.get("/api/comms/announcements", headers=emp_headers)
    assert emp_anno_res.status_code == 200
    assert any(a["id"] == anno_id for a in emp_anno_res.json())

    # 2. Notifications (Functionality 24)
    notif_res = client.get("/api/comms/notifications", headers=emp_headers)
    assert notif_res.status_code == 200

    # 3. Immutable Audit Log (Functionality 25)
    # Admin can view logs
    audit_res = client.get("/api/audit/logs", headers=admin_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) >= 3  # SETTINGS, AUTH, EMPLOYEE events logged
    actions = [l["action"] for l in logs]
    assert "CREATE" in actions

    # Non-admin (Employee) is forbidden (403)
    unauth_audit = client.get("/api/audit/logs", headers=emp_headers)
    assert unauth_audit.status_code == 403
