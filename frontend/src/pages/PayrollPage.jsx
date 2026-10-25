import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  DollarSign, Lock, Download, Play, FileText, CheckCircle,
  AlertTriangle, ShieldCheck, RefreshCw, Calendar
} from 'lucide-react';

export default function PayrollPage() {
  const { user } = useAuth();
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [payslips, setPayslips] = useState([]);

  useEffect(() => {
    loadPayrollData();
  }, []);

  async function loadPayrollData() {
    setLoading(true);
    try {
      if (user?.role === 'ADMIN' || user?.role === 'HR') {
        const runList = await api.listPayrollRuns();
        setRuns(runList);
        if (runList.length > 0) {
          const detail = await api.getPayrollRunDetails(runList[0].id);
          setSelectedRun(detail);
        }
      }
      const pList = await api.listPayslips();
      setPayslips(pList);
    } catch (err) {
      console.error("Failed to load payroll:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRun() {
    setRunLoading(true);
    try {
      const run = await api.runPayroll(targetMonth);
      alert(`Payroll draft for ${targetMonth} generated successfully!`);
      const detail = await api.getPayrollRunDetails(run.id);
      setSelectedRun(detail);
      loadPayrollData();
    } catch (err) {
      alert("Payroll run failed: " + err.message);
    } finally {
      setRunLoading(false);
    }
  }

  async function handleFinalizeRun(id) {
    if (!window.confirm("Are you sure you want to finalize this payroll run? Once finalized, it will be locked and cannot be modified.")) {
      return;
    }
    try {
      await api.finalizePayroll(id);
      alert("Payroll run locked and finalized successfully!");
      loadPayrollData();
    } catch (err) {
      alert("Finalization failed: " + err.message);
    }
  }

  async function handleDownloadPDF(id, empCode, month) {
    try {
      const blob = await api.downloadPayslipPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${empCode || 'emp'}_${month || 'current'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("PDF download failed: " + err.message);
    }
  }

  const isEmployee = user?.role === 'EMPLOYEE';

  return (
    <div style={{ padding: '28px', maxWidth: '1360px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="badge badge-success" style={{ marginBottom: '6px' }}>Compensation &amp; Payslips</span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
            {isEmployee ? 'My Payslips' : 'Payroll Lite Engine'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Gross = 1.5 × Basic (HRA 40%, Medical 10%). Tax slab automated. HR drafts, Admin finalizes.
          </p>
        </div>

        {user?.role === 'HR' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="month"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="form-input"
              style={{ width: '150px', padding: '7px 10px' }}
            />
            <button
              onClick={handleCreateRun}
              className="btn btn-primary"
              disabled={runLoading}
            >
              <Play size={16} />
              <span>{runLoading ? 'Calculating...' : 'Generate Monthly Draft'}</span>
            </button>
          </div>
        )}
      </div>

      {/* For Admin / HR: Payroll Runs Overview & Draft Review */}
      {(user?.role === 'ADMIN' || user?.role === 'HR') && (
        <>
          {/* Active Run Banner & Summary */}
          {selectedRun && (
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Payroll Run: {selectedRun.month}</h3>
                    <span className={`badge ${selectedRun.status === 'FINALIZED' ? 'badge-success' : 'badge-warning'}`}>
                      {selectedRun.status === 'FINALIZED' ? 'Locked & Finalized' : 'Draft Review'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {selectedRun.payslips?.length || 0} employees evaluated
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {user?.role === 'ADMIN' && selectedRun.status === 'DRAFT' && (
                    <button
                      onClick={() => handleFinalizeRun(selectedRun.id)}
                      className="btn btn-success"
                      style={{ borderRadius: '20px' }}
                    >
                      <Lock size={16} />
                      <span>Lock &amp; Finalize Payroll</span>
                    </button>
                  )}
                  {selectedRun.status === 'FINALIZED' && (
                    <span className="badge badge-success" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                      <Lock size={12} /> Finalized By Admin
                    </span>
                  )}
                </div>
              </div>

              {/* Stat Counters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px' }}>
                  <div className="form-label">Total Gross Salary</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                    PKR {selectedRun.total_gross?.toLocaleString()}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px' }}>
                  <div className="form-label">Total Deductions &amp; Tax</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fb7185', marginTop: '4px' }}>
                    PKR {selectedRun.total_deductions?.toLocaleString()}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px' }}>
                  <div className="form-label" style={{ color: 'var(--accent-emerald)' }}>Total Net Take-Home</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                    PKR {selectedRun.total_net?.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Draft Payslips Breakdown Table */}
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Dept &amp; Title</th>
                      <th>Basic</th>
                      <th>Gross (1.5×)</th>
                      <th>Absent / Unpaid</th>
                      <th>Deduction</th>
                      <th>Income Tax</th>
                      <th>Net Take-Home</th>
                      <th style={{ textAlign: 'right' }}>PDF Payslip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRun.payslips?.length === 0 ? (
                      <tr><td colSpan="9" style={{ textAlign: 'center', padding: '24px' }}>No payslips in this run.</td></tr>
                    ) : (
                      selectedRun.payslips?.map(p => (
                        <tr key={p.id}>
                          <td><b>{p.employee_name}</b> ({p.employee_code})</td>
                          <td>{p.department_name} • {p.designation_title}</td>
                          <td>PKR {p.basic_salary?.toLocaleString()}</td>
                          <td><b>PKR {p.gross_salary?.toLocaleString()}</b></td>
                          <td>{p.absent_days + p.unpaid_leave_days} d</td>
                          <td style={{ color: '#fb7185' }}>-PKR {p.deduction_amount?.toLocaleString()}</td>
                          <td style={{ color: '#fb7185' }}>-PKR {p.tax_deduction?.toLocaleString()}</td>
                          <td><b style={{ color: '#34d399' }}>PKR {p.net_salary?.toLocaleString()}</b></td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleDownloadPDF(p.id, p.employee_code, p.month)}
                              className="btn btn-secondary btn-sm"
                              title="Download ReportLab Generated PDF"
                            >
                              <Download size={14} /> PDF
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* For Employees: My Payslip History */}
      {isEmployee && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: 'var(--accent-primary)' }} /> My Official Payslip History
          </h3>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Basic Salary</th>
                  <th>HRA (40%)</th>
                  <th>Medical (10%)</th>
                  <th>Gross Salary</th>
                  <th>Deductions</th>
                  <th>Income Tax</th>
                  <th>Net Take-Home</th>
                  <th style={{ textAlign: 'right' }}>Download</th>
                </tr>
              </thead>
              <tbody>
                {payslips.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '28px' }}>No payslips published yet.</td></tr>
                ) : (
                  payslips.map(p => (
                    <tr key={p.id}>
                      <td><b>{p.month}</b></td>
                      <td>PKR {p.basic_salary?.toLocaleString()}</td>
                      <td>PKR {p.hra?.toLocaleString()}</td>
                      <td>PKR {p.medical_allowance?.toLocaleString()}</td>
                      <td><b>PKR {p.gross_salary?.toLocaleString()}</b></td>
                      <td style={{ color: '#fb7185' }}>-PKR {p.deduction_amount?.toLocaleString()}</td>
                      <td style={{ color: '#fb7185' }}>-PKR {p.tax_deduction?.toLocaleString()}</td>
                      <td><b style={{ color: '#34d399' }}>PKR {p.net_salary?.toLocaleString()}</b></td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDownloadPDF(p.id, p.employee_code, p.month)}
                          className="btn btn-primary btn-sm"
                        >
                          <Download size={14} /> Download PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
