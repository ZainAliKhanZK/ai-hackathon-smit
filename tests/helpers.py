def setup_system(client):
    """
    Initializes HCM Lite with company settings and admin account.
    Returns admin login response dictionary.
    """
    res = client.post("/api/setup/first-run", json={
        "company_name": "Saylani Tech Solutions",
        "admin_email": "admin@hcmlite.com",
        "admin_password": "Admin@Password123",
        "office_start": "09:00",
        "grace_time_minutes": 15,
        "half_day_hours": 5.0,
        "weekend_days": "Saturday,Sunday",
        "office_latitude": 24.8607,
        "office_longitude": 67.0011,
        "office_radius_meters": 150.0
    })
    assert res.status_code == 200, res.text

    # Log in as admin
    login_res = client.post("/api/auth/login", json={
        "email": "admin@hcmlite.com",
        "password": "Admin@Password123"
    })
    assert login_res.status_code == 200, login_res.text
    return login_res.json()

def get_auth_header(token):
    return {"Authorization": f"Bearer {token}"}

def create_hr_user(client, admin_token, email="hr@hcmlite.com", password="Hr@Password123"):
    """
    Admin creates an HR user and logs in to return HR credentials & token.
    """
    res = client.post(
        "/api/auth/users/hr",
        headers=get_auth_header(admin_token),
        json={"email": email, "password": password}
    )
    assert res.status_code == 200, res.text

    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_res.status_code == 200, login_res.text
    return login_res.json()

def setup_org_structure(client, admin_token):
    """
    Creates basic department and designation.
    Returns (department_id, designation_id).
    """
    headers = get_auth_header(admin_token)
    dept_res = client.post(
        "/api/org/departments",
        headers=headers,
        json={"name": "Engineering", "code": "ENG"}
    )
    assert dept_res.status_code == 200, dept_res.text
    dept_id = dept_res.json()["id"]

    desig_res = client.post(
        "/api/org/designations",
        headers=headers,
        json={"title": "Software Engineer", "department_id": dept_id}
    )
    assert desig_res.status_code == 200, desig_res.text
    desig_id = desig_res.json()["id"]

    return dept_id, desig_id

def create_employee_and_login(client, hr_token, dept_id, desig_id, email="emp1@hcmlite.com", code="EMP-001", salary=80000.0):
    """
    HR registers an employee, and logs in as the employee.
    Returns (employee_data, employee_token_dict).
    """
    emp_res = client.post(
        "/api/employees",
        headers=get_auth_header(hr_token),
        json={
            "employee_code": code,
            "first_name": "Ali",
            "last_name": "Khan",
            "email": email,
            "phone": "+923001234567",
            "address": "Karachi, Pakistan",
            "gender": "Male",
            "department_id": dept_id,
            "designation_id": desig_id,
            "join_date": "2026-01-01",
            "basic_salary": salary
        }
    )
    assert emp_res.status_code == 200, emp_res.text
    emp_data = emp_res.json()
    temp_pw = emp_data["temporary_password"]

    # Login as employee with temp password
    emp_login = client.post("/api/auth/login", json={
        "email": email,
        "password": temp_pw
    })
    assert emp_login.status_code == 200, emp_login.text
    return emp_data, emp_login.json()
