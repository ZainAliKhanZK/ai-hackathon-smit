from typing import Optional, List, Any
from pydantic import BaseModel
from datetime import datetime

# Auth & Setup
class FirstRunSetupRequest(BaseModel):
    company_name: str
    admin_email: str
    admin_password: str
    office_start: Optional[str] = "09:00"
    grace_time_minutes: Optional[int] = 15
    half_day_hours: Optional[float] = 5.0
    weekend_days: Optional[str] = "Saturday,Sunday"
    office_latitude: Optional[float] = 24.8607
    office_longitude: Optional[float] = 67.0011
    office_radius_meters: Optional[float] = 150.0

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    email: str
    employee_id: Optional[int] = None
    must_change_password: bool = False

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class CreateHRUserRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    must_change_password: bool
    employee_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Org Settings
class CompanySettingResponse(BaseModel):
    id: int
    company_name: str
    office_start: str
    grace_time_minutes: int
    half_day_hours: float
    weekend_days: str
    office_latitude: float
    office_longitude: float
    office_radius_meters: float

    class Config:
        from_attributes = True

class CompanySettingUpdate(BaseModel):
    company_name: Optional[str] = None
    office_start: Optional[str] = None
    grace_time_minutes: Optional[int] = None
    half_day_hours: Optional[float] = None
    weekend_days: Optional[str] = None
    office_latitude: Optional[float] = None
    office_longitude: Optional[float] = None
    office_radius_meters: Optional[float] = None

class DepartmentCreate(BaseModel):
    name: str
    code: str

class DepartmentResponse(BaseModel):
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True

class DesignationCreate(BaseModel):
    title: str
    department_id: int

class DesignationResponse(BaseModel):
    id: int
    title: str
    department_id: int
    department_name: Optional[str] = None

    class Config:
        from_attributes = True

class LeaveTypeCreate(BaseModel):
    name: str
    quota: int

class LeaveTypeResponse(BaseModel):
    id: int
    name: str
    quota: int

    class Config:
        from_attributes = True

class PublicHolidayCreate(BaseModel):
    name: str
    date: str  # YYYY-MM-DD

class PublicHolidayResponse(BaseModel):
    id: int
    name: str
    date: str

    class Config:
        from_attributes = True

# Employee
class EmployeeCreate(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = "Not Specified"
    department_id: int
    designation_id: int
    join_date: str  # YYYY-MM-DD
    basic_salary: float

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = None
    department_id: Optional[int] = None
    designation_id: Optional[int] = None
    status: Optional[str] = None
    exit_date: Optional[str] = None
    basic_salary: Optional[float] = None

class EmployeeSelfUpdate(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None

class EmployeeResponse(BaseModel):
    id: int
    employee_code: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = None
    department_id: int
    department_name: Optional[str] = None
    designation_id: int
    designation_title: Optional[str] = None
    join_date: str
    exit_date: Optional[str] = None
    status: str
    basic_salary: float
    gross_salary: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DryRunError(BaseModel):
    row: int
    field: str
    reason: str

class CSVDryRunResult(BaseModel):
    valid_count: int
    invalid_count: int
    total_rows: int
    errors: List[DryRunError]
    preview: List[dict]

# Attendance
class CheckInRequest(BaseModel):
    source: Optional[str] = "WEB"  # WEB, CAMERA
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None

class CheckOutRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class AttendanceResponse(BaseModel):
    id: Optional[int] = 0
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    status: str
    total_hours: float
    missing_checkout: bool
    source: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_verified: bool

    class Config:
        from_attributes = True

class AttendanceCorrectionCreate(BaseModel):
    date: str
    requested_check_in: Optional[str] = None
    requested_check_out: Optional[str] = None
    reason: str

class AttendanceCorrectionReview(BaseModel):
    status: str  # APPROVED, REJECTED
    reviewer_comment: Optional[str] = None

class AttendanceCorrectionResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    date: str
    requested_check_in: Optional[str] = None
    requested_check_out: Optional[str] = None
    reason: str
    status: str
    reviewer_comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Leave
class LeaveRequestCreate(BaseModel):
    leave_type_id: int
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    reason: str

class LeaveReviewRequest(BaseModel):
    status: str  # APPROVED, REJECTED
    reviewer_comment: Optional[str] = None

class LeaveResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    leave_type_id: int
    leave_type_name: Optional[str] = None
    start_date: str
    end_date: str
    working_days: float
    reason: str
    status: str
    reviewer_comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LeaveBalanceItem(BaseModel):
    leave_type_id: int
    name: str
    quota: int
    used: float
    remaining: float

# Payroll
class PayrollRunCreate(BaseModel):
    month: str  # YYYY-MM

class PayslipResponse(BaseModel):
    id: int
    payroll_run_id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    designation_title: Optional[str] = None
    month: str
    basic_salary: float
    hra: float
    medical_allowance: float
    gross_salary: float
    absent_days: float
    half_days: float
    unpaid_leave_days: float
    deduction_amount: float
    tax_deduction: float
    net_salary: float

    class Config:
        from_attributes = True

class PayrollRunResponse(BaseModel):
    id: int
    month: str
    total_gross: float
    total_deductions: float
    total_net: float
    status: str
    finalized_by: Optional[int] = None
    finalized_at: Optional[datetime] = None
    payslips: List[PayslipResponse] = []

    class Config:
        from_attributes = True

# AI Assistant
class AIChatRequest(BaseModel):
    message: str

class AIChatResponse(BaseModel):
    reply: str
    tool_called: Optional[str] = None
    is_ai_generated: bool = True

class SmartLeaveRequest(BaseModel):
    sentence: str

class SmartLeaveResponse(BaseModel):
    leave_type_id: Optional[int] = None
    leave_type_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    reason: Optional[str] = None
    raw_understanding: Optional[str] = None

class DashboardSummaryRequest(BaseModel):
    kpi_data: dict

class DashboardSummaryResponse(BaseModel):
    summary_bullets: List[str]

# Comms & Audit
class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: Optional[str] = "NORMAL"

class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    priority: str
    posted_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    actor_id: Optional[int] = None
    actor_name: str
    actor_role: str
    action: str
    entity: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
