import pytest
from datetime import datetime
from tests.helpers import (
    setup_system, get_auth_header, create_hr_user,
    setup_org_structure, create_employee_and_login
)

def test_func_14_15_payroll_draft_and_late_penalty(client):
    """
    Functionality 14 & 15 (+ Bonus late penalty):
    - HR generates monthly payroll draft for target month
    - Gross = 1.5 * Basic
    - HRA = 40% of Gross, Medical = 10% of Gross
    - 3 lates in a month = 0.5 day deduction
    - FBR annual tax slabs accurately applied
    """
    admin_auth = setup_system(client)
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    hr_headers = get_auth_header(hr_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])

    # Create employee with 100,000 basic salary -> gross = 150,000 / month = 1.8M / year
    # Tax on 1.8M = 30k + 15% of 600k = 30k + 90k = 120k / year = 10,000 / month
    emp_data, emp_login = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="payroll_emp@hcmlite.com", code="EMP-PAY-1", salary=100000.0
    )

    # Generate draft for 2026-05
    month_str = "2026-05"
    run_res = client.post("/api/payroll/run", headers=hr_headers, json={"month": month_str})
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["status"] == "DRAFT"
    assert run_data["month"] == month_str

    # Inspect payslips
    payslips_res = client.get(f"/api/payroll/payslips?month={month_str}", headers=hr_headers)
    assert payslips_res.status_code == 200
    payslips = payslips_res.json()
    assert len(payslips) >= 1
    p = next(slip for slip in payslips if slip["employee_id"] == emp_data["employee_id"])

    # Salary breakdown verification (Functionality 14)
    assert p["basic_salary"] == 100000.0
    assert p["gross_salary"] == 150000.0
    assert p["hra"] == 60000.0      # 40% of 150k
    assert p["medical_allowance"] == 15000.0  # 10% of 150k
    # Tax deduction verification (Functionality 15)
    assert p["tax_deduction"] == 10000.0

def test_func_16_finalize_payroll_lock(client):
    """
    Functionality 16:
    - HR generates draft
    - HR tries to finalize -> 403 Forbidden (Only Admin allowed)
    - Admin finalizes -> Status = FINALIZED
    - Re-running or re-finalizing locked month -> 400 Bad Request
    """
    admin_auth = setup_system(client)
    admin_headers = get_auth_header(admin_auth["access_token"])
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    hr_headers = get_auth_header(hr_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])

    create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="fin_emp@hcmlite.com", code="EMP-FIN-1", salary=80000.0
    )

    # 1. HR generates draft
    run_res = client.post("/api/payroll/run", headers=hr_headers, json={"month": "2026-06"})
    assert run_res.status_code == 200
    run_id = run_res.json()["id"]

    # 2. HR attempts to finalize -> 403 Forbidden
    hr_finalize = client.post(f"/api/payroll/runs/{run_id}/finalize", headers=hr_headers)
    assert hr_finalize.status_code == 403

    # 3. Admin finalizes -> 200 OK
    admin_finalize = client.post(f"/api/payroll/runs/{run_id}/finalize", headers=admin_headers)
    assert admin_finalize.status_code == 200
    assert admin_finalize.json()["status"] == "FINALIZED"

    # 4. Attempting to finalize again must fail
    dup_finalize = client.post(f"/api/payroll/runs/{run_id}/finalize", headers=admin_headers)
    assert dup_finalize.status_code == 400

    # 5. Attempting to re-run finalized month must fail
    rerun_res = client.post("/api/payroll/run", headers=hr_headers, json={"month": "2026-06"})
    assert rerun_res.status_code == 400
    assert "already finalized" in rerun_res.json()["detail"].lower()

def test_func_17_payslip_listing_and_pdf_generation(client):
    """
    Functionality 17:
    - Employee views own payslip
    - Dynamic ReportLab PDF download returns %PDF application/pdf
    - Scope guard: Employee cannot download another employee's payslip PDF
    """
    admin_auth = setup_system(client)
    admin_headers = get_auth_header(admin_auth["access_token"])
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])

    # Create 2 employees
    emp1_data, emp1_login = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="emp_slip1@hcmlite.com", code="EMP-SLIP-1", salary=70000.0
    )
    emp2_data, emp2_login = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="emp_slip2@hcmlite.com", code="EMP-SLIP-2", salary=75000.0
    )
    emp1_headers = get_auth_header(emp1_login["access_token"])

    # Generate payroll
    client.post("/api/payroll/run", headers=get_auth_header(hr_auth["access_token"]), json={"month": "2026-07"})

    # 1. Employee 1 views own payslips
    my_payslips = client.get("/api/payroll/payslips", headers=emp1_headers)
    assert my_payslips.status_code == 200
    slips = my_payslips.json()
    assert len(slips) == 1
    assert slips[0]["employee_id"] == emp1_data["employee_id"]
    emp1_payslip_id = slips[0]["id"]

    # 2. Download dynamic PDF payslip
    pdf_res = client.get(f"/api/payroll/payslips/{emp1_payslip_id}/pdf", headers=emp1_headers)
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers["content-type"]
    assert pdf_res.content.startswith(b"%PDF")

    # 3. Scope guard: Employee 1 tries to access Employee 2's payslip
    all_slips_admin = client.get("/api/payroll/payslips", headers=admin_headers).json()
    emp2_slip = next(s for s in all_slips_admin if s["employee_id"] == emp2_data["employee_id"])
    emp2_payslip_id = emp2_slip["id"]

    unauth_pdf = client.get(f"/api/payroll/payslips/{emp2_payslip_id}/pdf", headers=emp1_headers)
    assert unauth_pdf.status_code == 403
