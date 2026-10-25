import io
import pytest
from tests.helpers import (
    setup_system, get_auth_header, create_hr_user,
    setup_org_structure, create_employee_and_login
)

def test_func_06_employee_registration_and_updates(client):
    """
    Functionality 06:
    - HR registers employee: generates code, email, temp password
    - Duplicate employee code or email rejected
    - HR edits employee details
    - Employee self-updates contact info (phone/address)
    """
    admin_auth = setup_system(client)
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    hr_headers = get_auth_header(hr_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])

    # 1. HR registers employee
    emp_data, emp_login = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="kamran@hcmlite.com", code="EMP-101", salary=90000.0
    )
    emp_id = emp_data["employee_id"]
    emp_headers = get_auth_header(emp_login["access_token"])

    assert emp_data["employee_code"] == "EMP-101"
    assert emp_data["login_email"] == "kamran@hcmlite.com"
    assert emp_data["temporary_password"] is not None

    # 2. Reject duplicate employee code
    dup_res = client.post("/api/employees", headers=hr_headers, json={
        "employee_code": "EMP-101",
        "first_name": "Duplicate",
        "last_name": "User",
        "email": "dup@hcmlite.com",
        "department_id": dept_id,
        "designation_id": desig_id,
        "join_date": "2026-01-01",
        "basic_salary": 50000.0
    })
    assert dup_res.status_code == 400

    # 3. HR updates employee details (e.g. increase salary, change designation)
    update_res = client.put(f"/api/employees/{emp_id}", headers=hr_headers, json={
        "basic_salary": 95000.0,
        "phone": "+923009998877"
    })
    assert update_res.status_code == 200

    # 4. Employee self-update phone & address
    self_res = client.patch("/api/employees/me/self-update", headers=emp_headers, json={
        "phone": "+923331112233",
        "address": "Clifton, Karachi"
    })
    assert self_res.status_code == 200
    assert self_res.json()["phone"] == "+923331112233"
    assert self_res.json()["address"] == "Clifton, Karachi"

def test_func_07_employee_directory_and_360_scope(client):
    """
    Functionality 07:
    - HR views full employee directory with search and filters
    - Employee role sees ONLY their own record in directory
    - Employee 360 profile endpoint
    - Scope guard: Employee cannot view another employee's 360 profile (403)
    """
    admin_auth = setup_system(client)
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    hr_headers = get_auth_header(hr_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])

    # Create 2 employees
    emp1_data, emp1_auth = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="emp_one@hcmlite.com", code="EMP-001", salary=80000.0
    )
    emp2_data, emp2_auth = create_employee_and_login(
        client, hr_auth["access_token"], dept_id, desig_id,
        email="emp_two@hcmlite.com", code="EMP-002", salary=85000.0
    )

    # 1. HR sees all 2 employees in directory
    hr_dir = client.get("/api/employees", headers=hr_headers)
    assert hr_dir.status_code == 200
    assert hr_dir.json()["total"] == 2

    # Search filter by code
    hr_search = client.get("/api/employees?search=EMP-001", headers=hr_headers)
    assert hr_search.status_code == 200
    assert hr_search.json()["total"] == 1
    assert hr_search.json()["items"][0]["employee_code"] == "EMP-001"

    # 2. Scope Guard: Employee 1 sees ONLY themselves in directory
    emp1_headers = get_auth_header(emp1_auth["access_token"])
    emp1_dir = client.get("/api/employees", headers=emp1_headers)
    assert emp1_dir.status_code == 200
    assert emp1_dir.json()["total"] == 1
    assert emp1_dir.json()["items"][0]["email"] == "emp_one@hcmlite.com"

    # 3. Employee 360 Profile
    emp1_360 = client.get(f"/api/employees/{emp1_data['employee_id']}/360", headers=emp1_headers)
    assert emp1_360.status_code == 200
    data_360 = emp1_360.json()
    assert data_360["profile"]["employee_code"] == "EMP-001"
    assert "recent_attendance" in data_360
    assert "recent_leaves" in data_360
    assert "recent_payslips" in data_360

    # 4. Scope Guard: Employee 1 cannot view Employee 2's 360 profile
    emp1_view_emp2 = client.get(f"/api/employees/{emp2_data['employee_id']}/360", headers=emp1_headers)
    assert emp1_view_emp2.status_code == 403

def test_func_08_csv_import_and_export(client):
    """
    Functionality 08:
    - CSV dry-run with validation errors
    - CSV dry-run with valid data
    - CSV import creates records and returns auto-generated credentials
    - CSV export returns downloadable CSV with correct headers
    """
    admin_auth = setup_system(client)
    hr_auth = create_hr_user(client, admin_auth["access_token"])
    hr_headers = get_auth_header(hr_auth["access_token"])
    dept_id, desig_id = setup_org_structure(client, admin_auth["access_token"])

    # 1. Dry run with invalid data (negative salary, missing email)
    invalid_csv = """employee_code,first_name,last_name,email,join_date,basic_salary,department,designation
EMP-INVALID,Test,User,,2026-01-01,-5000,Engineering,Software Engineer
"""
    files = {"file": ("test_invalid.csv", invalid_csv.encode("utf-8"), "text/csv")}
    dry_res = client.post("/api/employees/csv-dry-run", headers=hr_headers, files=files)
    assert dry_res.status_code == 200
    dry_data = dry_res.json()
    assert dry_data["invalid_count"] > 0
    assert len(dry_data["errors"]) > 0

    # 2. Dry run with valid data
    valid_csv = """employee_code,first_name,last_name,email,join_date,basic_salary,department,designation,phone,gender
EMP-901,Tariq,Javed,tariq@hcmlite.com,2026-02-01,75000,Engineering,Software Engineer,+923001234567,Male
EMP-902,Ayesha,Bilal,ayesha@hcmlite.com,2026-02-01,85000,Engineering,Software Engineer,+923007654321,Female
"""
    files = {"file": ("test_valid.csv", valid_csv.encode("utf-8"), "text/csv")}
    dry_res2 = client.post("/api/employees/csv-dry-run", headers=hr_headers, files=files)
    assert dry_res2.status_code == 200
    dry_data2 = dry_res2.json()
    assert dry_data2["invalid_count"] == 0
    assert dry_data2["valid_count"] == 2

    # 3. CSV Import Execution
    files = {"file": ("test_valid.csv", valid_csv.encode("utf-8"), "text/csv")}
    import_res = client.post("/api/employees/csv-import", headers=hr_headers, files=files)
    assert import_res.status_code == 200
    import_data = import_res.json()
    assert import_data["imported_count"] == 2
    assert len(import_data["credentials"]) == 2

    # Verify imported user can log in
    tariq_cred = next(c for c in import_data["credentials"] if c["employee_code"] == "EMP-901")
    tariq_login = client.post("/api/auth/login", json={
        "email": tariq_cred["email"],
        "password": tariq_cred["temp_password"]
    })
    assert tariq_login.status_code == 200
    assert tariq_login.json()["role"] == "EMPLOYEE"

    # 4. CSV Export
    export_res = client.get("/api/employees/export-csv", headers=hr_headers)
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers["content-type"]
    csv_text = export_res.text
    assert "employee_code,first_name,last_name,email" in csv_text
    assert "EMP-901" in csv_text
    assert "EMP-902" in csv_text
