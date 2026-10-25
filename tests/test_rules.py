import pytest
from app.services.employee_service import calculate_salary_breakdown
from app.services.payroll_service import calculate_annual_tax
from app.services.attendance_service import haversine_distance_meters
from app.services.ai_service import generate_dashboard_summary

def test_salary_breakdown_formula():
    """
    Gross = 1.5 * basic (HRA 40%, Medical 10%)
    """
    basic = 100000.0
    breakdown = calculate_salary_breakdown(basic)
    assert breakdown["basic"] == 100000.0
    assert breakdown["gross"] == 150000.0
    assert breakdown["hra"] == 60000.0  # 40% of 150k
    assert breakdown["medical"] == 15000.0  # 10% of 150k

def test_annual_tax_slabs():
    """
    Tax slab on gross * 12:
    0 to 600k: 0
    600k to 1.2M: 5% of amount > 600k
    1.2M to 2.4M: 30k + 15% of amount > 1.2M
    """
    # Under 600k
    assert calculate_annual_tax(500000.0) == 0.0

    # 1,000,000 (between 600k and 1.2M) -> 5% of 400k = 20,000
    assert calculate_annual_tax(1000000.0) == 20000.0

    # 1,500,000 (between 1.2M and 2.4M) -> 30,000 + 15% of 300k = 30k + 45k = 75,000
    assert calculate_annual_tax(1500000.0) == 75000.0

def test_haversine_distance():
    # Distance between two identical coordinates must be 0
    d = haversine_distance_meters(24.8607, 67.0011, 24.8607, 67.0011)
    assert round(d, 2) == 0.0

    # Distance within ~100 meters
    d_near = haversine_distance_meters(24.8607, 67.0011, 24.8610, 67.0011)
    assert d_near < 100.0

def test_ai_dashboard_summary_bullets():
    kpi_data = {
        "headcount": 25,
        "present_today": 22,
        "late_today": 3,
        "on_leave_today": 2,
        "payroll_cost": 2500000.0,
        "avg_salary": 100000.0,
        "attrition_rate": 4.2
    }
    bullets = generate_dashboard_summary(kpi_data)
    assert len(bullets) >= 3
    assert any("25" in b for b in bullets)
    assert any("2,500,000.00" in b for b in bullets)
