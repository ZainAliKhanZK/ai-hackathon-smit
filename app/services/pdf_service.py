import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.models import Payslip, CompanySetting

def generate_payslip_pdf(payslip: Payslip, company_setting: CompanySetting) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    story = []

    # Title & Company
    company_name = company_setting.company_name if company_setting else "HCM Lite Company"
    title_style = ParagraphStyle(
        'CompanyTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1e293b"),
        alignment=1  # Center
    )
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#64748b"),
        alignment=1
    )

    story.append(Paragraph(company_name.upper(), title_style))
    story.append(Paragraph(f"CONFIDENTIAL PAYSLIP — {payslip.month}", subtitle_style))
    story.append(Spacer(1, 16))

    # Employee Information
    emp = payslip.employee
    emp_info_data = [
        [
            Paragraph(f"<b>Employee Name:</b> {emp.first_name} {emp.last_name}", styles['Normal']),
            Paragraph(f"<b>Employee Code:</b> {emp.employee_code}", styles['Normal'])
        ],
        [
            Paragraph(f"<b>Department:</b> {emp.department.name if emp.department else '-'}", styles['Normal']),
            Paragraph(f"<b>Designation:</b> {emp.designation.title if emp.designation else '-'}", styles['Normal'])
        ],
        [
            Paragraph(f"<b>Email:</b> {emp.email}", styles['Normal']),
            Paragraph(f"<b>Pay Period:</b> {payslip.month}", styles['Normal'])
        ]
    ]

    emp_table = Table(emp_info_data, colWidths=[270, 270])
    emp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(emp_table)
    story.append(Spacer(1, 16))

    # Earnings & Deductions Tables
    earnings_data = [
        ["EARNINGS", "AMOUNT (PKR)"],
        ["Basic Salary", f"{payslip.basic_salary:,.2f}"],
        ["House Rent Allowance (HRA 40%)", f"{payslip.hra:,.2f}"],
        ["Medical Allowance (10%)", f"{payslip.medical_allowance:,.2f}"],
        ["Total Gross Salary", f"{payslip.gross_salary:,.2f}"]
    ]

    total_deductions = payslip.deduction_amount + payslip.tax_deduction
    deductions_data = [
        ["DEDUCTIONS & TAX", "AMOUNT (PKR)"],
        [f"Absent / Unpaid ({payslip.absent_days + payslip.unpaid_leave_days} d)", f"{payslip.deduction_amount:,.2f}"],
        ["Half Day Deductions", f"{payslip.half_days} half days"],
        ["Income Tax (FBR Slabs)", f"{payslip.tax_deduction:,.2f}"],
        ["Total Deductions", f"{total_deductions:,.2f}"]
    ]

    breakdown_data = [
        [Table(earnings_data, colWidths=[170, 95]), Table(deductions_data, colWidths=[170, 95])]
    ]
    breakdown_table = Table(breakdown_data, colWidths=[270, 270])
    breakdown_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))

    # Style inner tables
    t_style = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#f1f5f9")),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('PADDING', (0,0), (-1,-1), 6),
    ])
    breakdown_data[0][0].setStyle(t_style)
    breakdown_data[0][1].setStyle(t_style)

    story.append(breakdown_table)
    story.append(Spacer(1, 20))

    # Net Salary Summary Banner
    net_data = [
        [
            Paragraph("<b>NET TAKE-HOME PAY</b>", ParagraphStyle('NetLbl', parent=styles['Normal'], fontSize=12, textColor=colors.HexColor("#0f172a"))),
            Paragraph(f"<b>PKR {payslip.net_salary:,.2f}</b>", ParagraphStyle('NetVal', parent=styles['Normal'], fontSize=16, textColor=colors.HexColor("#047857"), alignment=2))
        ]
    ]
    net_table = Table(net_data, colWidths=[270, 270])
    net_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#10b981")),
        ('PADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(net_table)
    story.append(Spacer(1, 24))

    # Footer note
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Italic'],
        fontSize=8,
        textColor=colors.HexColor("#94a3b8"),
        alignment=1
    )
    story.append(Paragraph("This is a computer-generated payslip from HCM Lite and requires no physical signature.", footer_style))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
