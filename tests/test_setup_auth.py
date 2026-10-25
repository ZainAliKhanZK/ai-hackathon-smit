import pytest
from tests.helpers import setup_system, get_auth_header, create_hr_user

def test_func_01_first_run_setup(client):
    """
    Functionality 01:
    - Check setup status when empty (is_setup_needed == True)
    - Complete first-run setup
    - Verify setup status is now complete (is_setup_needed == False)
    - Second attempt must be rejected with 400 Bad Request
    """
    # 1. Initially setup is needed
    status_res = client.get("/api/setup/status")
    assert status_res.status_code == 200
    assert status_res.json()["is_setup_needed"] is True
    assert status_res.json()["company_name"] is None

    # 2. Complete first run setup
    admin_auth = setup_system(client)
    assert admin_auth["role"] == "ADMIN"
    assert admin_auth["email"] == "admin@hcmlite.com"

    # 3. Setup is no longer needed
    status_res2 = client.get("/api/setup/status")
    assert status_res2.status_code == 200
    assert status_res2.json()["is_setup_needed"] is False
    assert status_res2.json()["company_name"] == "Saylani Tech Solutions"

    # 4. Attempting first-run setup again must fail
    dup_res = client.post("/api/setup/first-run", json={
        "company_name": "Another Company",
        "admin_email": "another@company.com",
        "admin_password": "AnotherPassword123"
    })
    assert dup_res.status_code == 400
    assert "already been completed" in dup_res.json()["detail"]

def test_func_02_login_and_change_password(client):
    """
    Functionality 02:
    - Login with correct and incorrect credentials
    - Verify /api/auth/me profile
    - Change password
    - Validate new password works and old password fails
    """
    admin_auth = setup_system(client)
    token = admin_auth["access_token"]
    headers = get_auth_header(token)

    # 1. Invalid login
    bad_login = client.post("/api/auth/login", json={
        "email": "admin@hcmlite.com",
        "password": "WrongPassword999"
    })
    assert bad_login.status_code == 401

    # 2. Get profile /api/auth/me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    profile = me_res.json()
    assert profile["email"] == "admin@hcmlite.com"
    assert profile["role"] == "ADMIN"
    assert profile["is_active"] is True

    # 3. Change password
    change_res = client.post("/api/auth/change-password", headers=headers, json={
        "old_password": "Admin@Password123",
        "new_password": "Admin@NewPassword999"
    })
    assert change_res.status_code == 200

    # 4. Verify old password fails
    old_login = client.post("/api/auth/login", json={
        "email": "admin@hcmlite.com",
        "password": "Admin@Password123"
    })
    assert old_login.status_code == 401

    # 5. Verify new password succeeds
    new_login = client.post("/api/auth/login", json={
        "email": "admin@hcmlite.com",
        "password": "Admin@NewPassword999"
    })
    assert new_login.status_code == 200
    assert new_login.json()["role"] == "ADMIN"

def test_func_05_hr_management_and_account_controls(client):
    """
    Functionality 05:
    - Admin creates HR login
    - Admin lists all users
    - Admin deactivates user (deactivated user gets 403 on login)
    - Admin resets password (gets temporary password)
    - RBAC: Non-admin cannot create HR
    """
    admin_auth = setup_system(client)
    admin_token = admin_auth["access_token"]
    admin_headers = get_auth_header(admin_token)

    # 1. Create HR user
    hr_auth = create_hr_user(client, admin_token, email="test_hr@hcmlite.com", password="HrPassword@123")
    assert hr_auth["role"] == "HR"
    hr_headers = get_auth_header(hr_auth["access_token"])

    # 2. RBAC: HR cannot create another HR
    unauth_hr = client.post(
        "/api/auth/users/hr",
        headers=hr_headers,
        json={"email": "illegal_hr@hcmlite.com", "password": "Password@123"}
    )
    assert unauth_hr.status_code == 403

    # 3. Admin lists users
    users_res = client.get("/api/auth/users", headers=admin_headers)
    assert users_res.status_code == 200
    users = users_res.json()
    assert len(users) >= 2
    hr_user_record = next(u for u in users if u["email"] == "test_hr@hcmlite.com")
    hr_id = hr_user_record["id"]

    # 4. Deactivate HR user
    deact_res = client.patch(f"/api/auth/users/{hr_id}/status?is_active=false", headers=admin_headers)
    assert deact_res.status_code == 200

    # 5. Deactivated user cannot log in
    deact_login = client.post("/api/auth/login", json={
        "email": "test_hr@hcmlite.com",
        "password": "HrPassword@123"
    })
    assert deact_login.status_code == 403
    assert "deactivated" in deact_login.json()["detail"].lower()

    # 6. Re-activate HR user
    react_res = client.patch(f"/api/auth/users/{hr_id}/status?is_active=true", headers=admin_headers)
    assert react_res.status_code == 200

    # 7. Reset password
    reset_res = client.post(f"/api/auth/users/{hr_id}/reset-password", headers=admin_headers)
    assert reset_res.status_code == 200
    temp_pw = reset_res.json()["temporary_password"]

    # 8. User logs in with temporary password
    temp_login = client.post("/api/auth/login", json={
        "email": "test_hr@hcmlite.com",
        "password": temp_pw
    })
    assert temp_login.status_code == 200
    assert temp_login.json()["must_change_password"] is True
