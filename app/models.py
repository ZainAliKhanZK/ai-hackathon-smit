import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.database import Base

class CompanySetting(Base):
    __tablename__ = "company_settings"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), default="My Company")
    office_start = Column(String(10), default="09:00")
    grace_time_minutes = Column(Integer, default=15)
    half_day_hours = Column(Float, default=5.0)
    weekend_days = Column(String(100), default="Saturday,Sunday")
    office_latitude = Column(Float, default=24.8607)
    office_longitude = Column(Float, default=67.0011)
    office_radius_meters = Column(Float, default=150.0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # ADMIN, HR, EMPLOYEE
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=False)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    employee = relationship("Employee", back_populates="user_account", foreign_keys=[employee_id])

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)

    designations = relationship("Designation", back_populates="department", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="department")

class Designation(Base):
    __tablename__ = "designations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)

    department = relationship("Department", back_populates="designations")
    employees = relationship("Employee", back_populates="designation")

class LeaveType(Base):
    __tablename__ = "leave_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    quota = Column(Integer, default=0)  # Annual: 14, Sick: 8, Casual: 10, Unpaid: 0

    leave_requests = relationship("LeaveRequest", back_populates="leave_type")

class PublicHoliday(Base):
    __tablename__ = "public_holidays"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    date = Column(String(10), unique=True, nullable=False)  # YYYY-MM-DD

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(50), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    gender = Column(String(20), default="Not Specified")  # Male, Female, Other
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    designation_id = Column(Integer, ForeignKey("designations.id"), nullable=False)
    join_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    exit_date = Column(String(10), nullable=True)   # YYYY-MM-DD
    status = Column(String(30), default="ACTIVE")   # ACTIVE, PROBATION, EXITED
    basic_salary = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    department = relationship("Department", back_populates="employees")
    designation = relationship("Designation", back_populates="employees")
    user_account = relationship("User", back_populates="employee", uselist=False)
    attendance_records = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")
    attendance_corrections = relationship("AttendanceCorrection", back_populates="employee", cascade="all, delete-orphan")
    payslips = relationship("Payslip", back_populates="employee", cascade="all, delete-orphan")

class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(10), index=True, nullable=False)  # YYYY-MM-DD
    check_in = Column(String(30), nullable=True)           # HH:MM:SS or ISO
    check_out = Column(String(30), nullable=True)          # HH:MM:SS or ISO
    status = Column(String(30), default="PRESENT")         # PRESENT, LATE, HALF_DAY, ABSENT
    total_hours = Column(Float, default=0.0)
    missing_checkout = Column(Boolean, default=False)
    source = Column(String(30), default="WEB")             # WEB, CAMERA
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    location_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    employee = relationship("Employee", back_populates="attendance_records")

class AttendanceCorrection(Base):
    __tablename__ = "attendance_corrections"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(10), nullable=False)              # YYYY-MM-DD
    requested_check_in = Column(String(30), nullable=True)
    requested_check_out = Column(String(30), nullable=True)
    reason = Column(Text, nullable=False)
    status = Column(String(30), default="PENDING")         # PENDING, APPROVED, REJECTED
    reviewer_comment = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    employee = relationship("Employee", back_populates="attendance_corrections")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"), nullable=False)
    start_date = Column(String(10), nullable=False)        # YYYY-MM-DD
    end_date = Column(String(10), nullable=False)          # YYYY-MM-DD
    working_days = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(30), default="PENDING")         # PENDING, APPROVED, REJECTED, CANCELLED
    reviewer_comment = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    employee = relationship("Employee", back_populates="leave_requests")
    leave_type = relationship("LeaveType", back_populates="leave_requests")

class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    id = Column(Integer, primary_key=True, index=True)
    month = Column(String(7), unique=True, index=True, nullable=False)  # YYYY-MM
    total_gross = Column(Float, default=0.0)
    total_deductions = Column(Float, default=0.0)
    total_net = Column(Float, default=0.0)
    status = Column(String(30), default="DRAFT")  # DRAFT, FINALIZED
    finalized_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    finalized_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    payslips = relationship("Payslip", back_populates="payroll_run", cascade="all, delete-orphan")

class Payslip(Base):
    __tablename__ = "payslips"

    id = Column(Integer, primary_key=True, index=True)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    month = Column(String(7), index=True, nullable=False)  # YYYY-MM
    basic_salary = Column(Float, default=0.0)
    hra = Column(Float, default=0.0)                      # 40% of gross
    medical_allowance = Column(Float, default=0.0)        # 10% of gross
    gross_salary = Column(Float, default=0.0)             # 1.5 * basic
    absent_days = Column(Float, default=0.0)
    half_days = Column(Float, default=0.0)
    unpaid_leave_days = Column(Float, default=0.0)
    deduction_amount = Column(Float, default=0.0)
    tax_deduction = Column(Float, default=0.0)
    net_salary = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    payroll_run = relationship("PayrollRun", back_populates="payslips")
    employee = relationship("Employee", back_populates="payslips")

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(String(20), default="NORMAL")  # NORMAL, IMPORTANT
    posted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(30), default="INFO")  # INFO, SUCCESS, WARNING, DANGER
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_name = Column(String(150), default="System")
    actor_role = Column(String(50), default="SYSTEM")
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, APPROVE, FINALIZE, DELETE_ATTEMPT
    entity = Column(String(50), nullable=False)  # EMPLOYEE, PAYROLL, LEAVE, SETTINGS, ATTENDANCE
    entity_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)        # JSON string of before / after changes
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AILog(Base):
    __tablename__ = "ai_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    role = Column(String(50), default="USER")
    prompt = Column(Text, nullable=False)
    tools_called = Column(Text, nullable=True)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
