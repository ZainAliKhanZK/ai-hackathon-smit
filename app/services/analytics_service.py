import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.models import (
    Employee, Department, Designation, Attendance, LeaveRequest,
    LeaveType, PayrollRun, Payslip, AuditLog, Announcement
)
from app.services.org_service import count_working_days

def get_admin_dashboard_metrics(
    db: Session,
    department_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    current_year_str = str(datetime.date.today().year)

    emp_query = db.query(Employee)
    if department_id:
        emp_query = emp_query.filter(Employee.department_id == department_id)

    all_employees = emp_query.all()
    total_headcount = sum(1 for e in all_employees if e.status in ["ACTIVE", "PROBATION"])

    # Attrition YTD formula: exits in period ÷ average headcount × 100
    exited_ytd = sum(1 for e in all_employees if e.status == "EXITED" and (e.exit_date or "").startswith(current_year_str))
    avg_headcount = max(1.0, total_headcount + (exited_ytd / 2.0))
    attrition_rate = round((exited_ytd / avg_headcount) * 100.0, 1)

    # Payroll metrics (most recent finalized run or overall)
    latest_run = db.query(PayrollRun).order_by(PayrollRun.month.desc()).first()
    if latest_run:
        p_query = db.query(Payslip).filter(Payslip.payroll_run_id == latest_run.id)
        if department_id:
            p_query = p_query.join(Employee).filter(Employee.department_id == department_id)
        payslips = p_query.all()
        payroll_cost = sum(p.gross_salary for p in payslips)
        avg_salary = (payroll_cost / len(payslips)) if payslips else 0.0
    else:
        # Fallback to sum of base salaries
        payroll_cost = sum(e.basic_salary * 1.5 for e in all_employees if e.status in ["ACTIVE", "PROBATION"])
        avg_salary = (payroll_cost / total_headcount) if total_headcount else 0.0

    # Headcount by department
    dept_counts = []
    dept_payroll = []
    departments = db.query(Department).all()
    for d in departments:
        d_emps = [e for e in all_employees if e.department_id == d.id and e.status in ["ACTIVE", "PROBATION"]]
        dept_counts.append({
            "department": d.name,
            "count": len(d_emps)
        })
        dept_payroll.append({
            "department": d.name,
            "cost": sum(e.basic_salary * 1.5 for e in d_emps)
        })

    # Gender breakdown
    gender_map = {}
    for e in all_employees:
        g = e.gender or "Not Specified"
        gender_map[g] = gender_map.get(g, 0) + 1

    gender_distribution = [{"gender": k, "count": v} for k, v in gender_map.items()]

    # Tenure breakdown (years at company)
    tenure_distribution = {"< 1 Year": 0, "1-3 Years": 0, "3-5 Years": 0, "5+ Years": 0}
    for e in all_employees:
        if e.join_date:
            try:
                j_d = datetime.datetime.strptime(e.join_date, "%Y-%m-%d").date()
                diff_years = (datetime.date.today() - j_d).days / 365.25
                if diff_years < 1:
                    tenure_distribution["< 1 Year"] += 1
                elif diff_years < 3:
                    tenure_distribution["1-3 Years"] += 1
                elif diff_years < 5:
                    tenure_distribution["3-5 Years"] += 1
                else:
                    tenure_distribution["5+ Years"] += 1
            except Exception:
                tenure_distribution["< 1 Year"] += 1

    # Recent Audit Feed (Admin view)
    audit_logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()
    audit_feed = [
        {
            "id": a.id,
            "actor": a.actor_name,
            "action": a.action,
            "entity": a.entity,
            "time": a.created_at.strftime("%Y-%m-%d %H:%M"),
            "details": a.details
        } for a in audit_logs
    ]

    return {
        "kpis": {
            "headcount": total_headcount,
            "attrition_rate": attrition_rate,
            "payroll_cost": round(payroll_cost, 2),
            "avg_salary": round(avg_salary, 2),
            "active_departments": len(departments)
        },
        "headcount_by_department": dept_counts,
        "payroll_by_department": dept_payroll,
        "gender_distribution": gender_distribution,
        "tenure_distribution": [{"bracket": k, "count": v} for k, v in tenure_distribution.items()],
        "recent_audit_feed": audit_feed
    }

def get_hr_dashboard_metrics(
    db: Session,
    department_id: Optional[int] = None
) -> Dict[str, Any]:
    today_str = datetime.date.today().strftime("%Y-%m-%d")

    emp_query = db.query(Employee).filter(Employee.status.in_(["ACTIVE", "PROBATION"]))
    if department_id:
        emp_query = emp_query.filter(Employee.department_id == department_id)
    employees = emp_query.all()
    emp_ids = [e.id for e in employees]

    total_headcount = len(employees)

    # Attendance today
    today_attendances = db.query(Attendance).filter(
        Attendance.date == today_str,
        Attendance.employee_id.in_(emp_ids)
    ).all() if emp_ids else []

    present_today = sum(1 for a in today_attendances if a.status in ["PRESENT", "HALF_DAY"])
    late_today = sum(1 for a in today_attendances if a.status == "LATE")

    # On leave today
    leaves_today = db.query(LeaveRequest).filter(
        LeaveRequest.status == "APPROVED",
        LeaveRequest.start_date <= today_str,
        LeaveRequest.end_date >= today_str,
        LeaveRequest.employee_id.in_(emp_ids)
    ).all() if emp_ids else []
    on_leave_today = len(leaves_today)

    # Pending approvals
    pending_leaves = db.query(LeaveRequest).filter(LeaveRequest.status == "PENDING").count()

    # Top 5 late-comers this month
    cur_month_str = today_str[:7]
    month_attendances = db.query(Attendance).filter(
        Attendance.date.startswith(cur_month_str),
        Attendance.status == "LATE"
    ).all()

    late_count_map = {}
    for a in month_attendances:
        late_count_map[a.employee_id] = late_count_map.get(a.employee_id, 0) + 1

    top_late_emp_ids = sorted(late_count_map.keys(), key=lambda eid: late_count_map[eid], reverse=True)[:5]
    top_late_comers = []
    for eid in top_late_emp_ids:
        emp = db.query(Employee).filter(Employee.id == eid).first()
        if emp:
            top_late_comers.append({
                "employee_name": f"{emp.first_name} {emp.last_name}",
                "department": emp.department.name if emp.department else "-",
                "late_count": late_count_map[eid]
            })

    # Leave utilization by leave type
    leave_types = db.query(LeaveType).all()
    leave_by_type = []
    for lt in leave_types:
        approved_days = db.query(func.sum(LeaveRequest.working_days)).filter(
            LeaveRequest.leave_type_id == lt.id,
            LeaveRequest.status == "APPROVED"
        ).scalar() or 0.0
        leave_by_type.append({
            "type": lt.name,
            "days": approved_days,
            "quota": lt.quota
        })

    # Attendance trend (last 7 days)
    attendance_trend = []
    for i in range(6, -1, -1):
        d = (datetime.date.today() - datetime.timedelta(days=i)).strftime("%Y-%m-%d")
        day_records = db.query(Attendance).filter(
            Attendance.date == d,
            Attendance.employee_id.in_(emp_ids)
        ).all() if emp_ids else []
        attendance_trend.append({
            "date": d,
            "present": sum(1 for a in day_records if a.status in ["PRESENT", "HALF_DAY"]),
            "late": sum(1 for a in day_records if a.status == "LATE")
        })

    return {
        "kpis": {
            "headcount": total_headcount,
            "present_today": present_today,
            "on_leave_today": on_leave_today,
            "late_today": late_today,
            "pending_approvals": pending_leaves
        },
        "top_late_comers": top_late_comers,
        "leave_by_type": leave_by_type,
        "attendance_trend": attendance_trend
    }

def get_employee_dashboard_metrics(db: Session, employee_id: int) -> Dict[str, Any]:
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    cur_month_str = today_str[:7]

    # Today's check-in status
    today_record = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.date == today_str
    ).first()

    # Hours this week vs 40h
    today_date = datetime.date.today()
    start_of_week = today_date - datetime.timedelta(days=today_date.weekday())
    week_start_str = start_of_week.strftime("%Y-%m-%d")

    week_records = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.date >= week_start_str,
        Attendance.date <= today_str
    ).all()
    hours_this_week = sum(a.total_hours for a in week_records)

    # Late count this month
    late_count = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.date.startswith(cur_month_str),
        Attendance.status == "LATE"
    ).count()

    # Leave balance summary
    leave_types = db.query(LeaveType).all()
    leave_balances = []
    for lt in leave_types:
        used = db.query(func.sum(LeaveRequest.working_days)).filter(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.leave_type_id == lt.id,
            LeaveRequest.status == "APPROVED"
        ).scalar() or 0.0
        remaining = max(0.0, lt.quota - used) if lt.quota > 0 else 999.0
        leave_balances.append({
            "name": lt.name,
            "quota": lt.quota,
            "used": used,
            "remaining": remaining
        })

    # Last payslip
    last_payslip = db.query(Payslip).filter(
        Payslip.employee_id == employee_id
    ).order_by(Payslip.month.desc()).first()

    # Announcements
    announcements = db.query(Announcement).order_by(Announcement.created_at.desc()).limit(5).all()

    return {
        "today_attendance": {
            "checked_in": bool(today_record and today_record.check_in),
            "check_in_time": today_record.check_in if today_record else None,
            "checked_out": bool(today_record and today_record.check_out),
            "check_out_time": today_record.check_out if today_record else None,
            "status": today_record.status if today_record else "NOT_CHECKED_IN",
            "total_hours": today_record.total_hours if today_record else 0.0
        },
        "hours_this_week": round(hours_this_week, 1),
        "target_hours": 40.0,
        "late_count_month": late_count,
        "leave_balances": leave_balances,
        "last_payslip": {
            "id": last_payslip.id,
            "month": last_payslip.month,
            "net_salary": last_payslip.net_salary
        } if last_payslip else None,
        "announcements": [
            {
                "id": a.id,
                "title": a.title,
                "content": a.content,
                "priority": a.priority,
                "date": a.created_at.strftime("%Y-%m-%d")
            } for a in announcements
        ]
    }
