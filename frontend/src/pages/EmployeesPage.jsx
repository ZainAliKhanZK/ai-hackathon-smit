import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Employee360Modal from '../components/Employee360Modal';
import {
  Users, UserPlus, Upload, Download, Search, Filter,
  Eye, Edit3, CheckCircle, AlertTriangle, X, RefreshCw, Key
} from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [orgError, setOrgError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selected360Id, setSelected360Id] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showSelfEditModal, setShowSelfEditModal] = useState(false);

  // Register form
  const [regForm, setRegForm] = useState({
    employee_code: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    gender: 'Male',
    department_id: '',
    designation_id: '',
    join_date: getLocalDateString(),
    basic_salary: 80000
  });
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // CSV Dry Run state
  const [csvFile, setCsvFile] = useState(null);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState(null);

  // Self edit state
  const [selfPhone, setSelfPhone] = useState('');
  const [selfAddress, setSelfAddress] = useState('');

  useEffect(() => {
    loadDepartmentsAndDesignations();
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [page, search, departmentId, statusFilter]);

  async function loadDepartmentsAndDesignations() {
    setOrgError(null);
    try {
      const [depts, desigs] = await Promise.all([
        api.listDepartments(),
        api.listDesignations()
      ]);
      setDepartments(depts);
      setDesignations(desigs);
      // Reset form selections when data reloads
      setRegForm(prev => ({
        ...prev,
        department_id: depts.length > 0 ? depts[0].id : '',
        designation_id: desigs.length > 0 ? desigs[0].id : ''
      }));
    } catch (err) {
      setOrgError('Failed to load departments/designations: ' + err.message);
    }
  }

  async function loadEmployees() {
    setLoading(true);
    try {
      let params = `page=${page}&limit=10`;
      if (search) params += `&search=${encodeURIComponent(search)}`;
      if (departmentId) params += `&department_id=${departmentId}`;
      if (statusFilter) params += `&status_filter=${statusFilter}`;

      const res = await api.listEmployees(params);
      setEmployees(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    try {
      const payload = {
        ...regForm,
        department_id: parseInt(regForm.department_id),
        designation_id: parseInt(regForm.designation_id),
        basic_salary: parseFloat(regForm.basic_salary)
      };
      const res = await api.registerEmployee(payload);
      setCreatedCredentials(res);
      loadEmployees();
    } catch (err) {
      alert("Registration failed: " + err.message);
    }
  }

  async function handleCSVDryRun() {
    if (!csvFile) return;
    setCsvLoading(true);
    setDryRunResult(null);
    setCsvSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      const res = await api.csvDryRun(formData);
      setDryRunResult(res);
    } catch (err) {
      alert("Dry run check failed: " + err.message);
    } finally {
      setCsvLoading(false);
    }
  }

  async function handleCSVImport() {
    if (!csvFile) return;
    setCsvLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      const res = await api.csvImport(formData);
      setCsvSuccess(res);
      setDryRunResult(null);
      loadEmployees();
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      setCsvLoading(false);
    }
  }

  async function handleExportCSV() {
    try {
      const blob = await api.get('/employees/export-csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_export_${getLocalDateString()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("CSV Export failed: " + err.message);
    }
  }

  async function handleSelfUpdate(e) {
    e.preventDefault();
    try {
      await api.selfUpdateProfile({ phone: selfPhone, address: selfAddress });
      alert("Contact details updated successfully!");
      setShowSelfEditModal(false);
      loadEmployees();
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    }
  }

  return (
    <div style={{ padding: '28px', maxWidth: '1360px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="badge badge-purple" style={{ marginBottom: '6px' }}>Personnel Directory</span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Employee Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Search, filter, inspect Employee 360 profiles, or import in bulk.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user?.role === 'HR' && (
            <>
              <button onClick={() => { setCreatedCredentials(null); setShowRegisterModal(true); }} className="btn btn-primary">
                <UserPlus size={16} />
                <span>Register Employee</span>
              </button>
              <button onClick={() => { setCsvFile(null); setDryRunResult(null); setCsvSuccess(null); setShowCSVModal(true); }} className="btn btn-secondary">
                <Upload size={16} />
                <span>CSV Import</span>
              </button>
            </>
          )}

          {user?.role === 'EMPLOYEE' && (
            <button onClick={() => setShowSelfEditModal(true)} className="btn btn-secondary">
              <Edit3 size={16} />
              <span>Update My Phone / Address</span>
            </button>
          )}

          {(user?.role === 'ADMIN' || user?.role === 'HR') && (
            <button onClick={handleExportCSV} className="btn btn-secondary" title="Export CSV">
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search name, code, or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
        </div>

        {user?.role !== 'EMPLOYEE' && (
          <>
            <select
              value={departmentId}
              onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
              className="form-select"
              style={{ width: '180px' }}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="form-select"
              style={{ width: '150px' }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PROBATION">PROBATION</option>
              <option value="EXITED">EXITED</option>
            </select>
          </>
        )}
      </div>

      {/* Employee Table */}
      <div className="table-container glass-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Join Date</th>
              <th>Status</th>
              <th>Salary (Gross)</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '32px' }}>Loading employees...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>No employee records found.</td></tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id}>
                  <td><b style={{ color: 'var(--accent-primary)' }}>{emp.employee_code}</b></td>
                  <td><b>{emp.first_name} {emp.last_name}</b></td>
                  <td>{emp.email}</td>
                  <td>{emp.department_name || '-'}</td>
                  <td>{emp.designation_title || '-'}</td>
                  <td>{emp.join_date}</td>
                  <td>
                    <span className={`badge ${emp.status === 'ACTIVE' ? 'badge-success' : emp.status === 'PROBATION' ? 'badge-warning' : 'badge-danger'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td>
                    {user?.role !== 'EMPLOYEE' || user?.employee_id === emp.id ? (
                      <span>PKR {emp.gross_salary?.toLocaleString()}</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>Confidential</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setSelected360Id(emp.id)}
                      className="btn btn-secondary btn-sm"
                      title="View Employee 360"
                    >
                      <Eye size={14} /> 360°
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing {employees.length} of {total} employees
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn btn-secondary btn-sm"
          >
            Previous
          </button>
          <span style={{ padding: '6px 12px', fontSize: '0.85rem', fontWeight: 700 }}>
            Page {page}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * 10 >= total}
            className="btn btn-secondary btn-sm"
          >
            Next
          </button>
        </div>
      </div>

      {/* Employee 360 Modal */}
      {selected360Id && (
        <Employee360Modal
          employeeId={selected360Id}
          onClose={() => setSelected360Id(null)}
        />
      )}

      {/* Register Employee Modal (Functionality 06) */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Register New Employee</h3>
              <button onClick={() => setShowRegisterModal(false)} className="btn-secondary btn-sm" style={{ padding: '4px', borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            {createdCredentials ? (
              <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, marginBottom: '10px' }}>
                  <CheckCircle size={20} />
                  <span>Employee Registered &amp; Account Created!</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Share these initial sign-in credentials with the employee. The employee will be prompted to change their temporary password on first sign-in.
                </p>
                <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <div style={{ marginBottom: '6px' }}><b>Employee Code:</b> {createdCredentials.employee_code}</div>
                  <div style={{ marginBottom: '6px' }}><b>Login Email:</b> {createdCredentials.login_email}</div>
                  <div><b>Temporary Password:</b> <code style={{ color: '#fbbf24', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px' }}>{createdCredentials.temporary_password}</code></div>
                </div>
                <button onClick={() => { setShowRegisterModal(false); setCreatedCredentials(null); }} className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister}>
                {orgError && (
                  <div style={{
                    padding: '10px 14px',
                    marginBottom: '14px',
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.35)',
                    borderRadius: '8px',
                    color: '#fb7185',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}>
                    <span>⚠️ {orgError}</span>
                    <button
                      type="button"
                      onClick={loadDepartmentsAndDesignations}
                      className="btn btn-secondary btn-sm"
                      style={{ whiteSpace: 'nowrap', padding: '4px 10px', fontSize: '0.78rem' }}
                    >
                      Retry
                    </button>
                  </div>
                )}
                {departments.length === 0 && !orgError && (
                  <div style={{
                    padding: '10px 14px',
                    marginBottom: '14px',
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '8px',
                    color: '#fbbf24',
                    fontSize: '0.82rem'
                  }}>
                    ⚠️ No departments found. Please ask an Admin to create departments and designations in Settings first.
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Employee Code</label>
                    <input
                      type="text"
                      placeholder="EMP-001"
                      value={regForm.employee_code}
                      onChange={(e) => setRegForm({ ...regForm, employee_code: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      placeholder="Ali"
                      value={regForm.first_name}
                      onChange={(e) => setRegForm({ ...regForm, first_name: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      placeholder="Khan"
                      value={regForm.last_name}
                      onChange={(e) => setRegForm({ ...regForm, last_name: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Email Address (Login)</label>
                    <input
                      type="email"
                      placeholder="ali@company.com"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      placeholder="+92 300 1234567"
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select
                      value={regForm.department_id}
                      onChange={(e) => setRegForm({ ...regForm, department_id: e.target.value })}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designation</label>
                    <select
                      value={regForm.designation_id}
                      onChange={(e) => setRegForm({ ...regForm, designation_id: e.target.value })}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Designation --</option>
                      {designations.map(d => (
                        <option key={d.id} value={d.id}>{d.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      value={regForm.gender}
                      onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                      className="form-select"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Join Date (ISO YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={regForm.join_date}
                      onChange={(e) => setRegForm({ ...regForm, join_date: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Basic Salary (PKR)</label>
                    <input
                      type="number"
                      value={regForm.basic_salary}
                      onChange={(e) => setRegForm({ ...regForm, basic_salary: e.target.value })}
                      required
                      className="form-input"
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      Gross will be: PKR {(regForm.basic_salary * 1.5).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button type="button" onClick={() => setShowRegisterModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Employee &amp; Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CSV Import Modal with Dry Run (Functionality 08) */}
      {showCSVModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Bulk CSV Import with Dry-Run Validation</h3>
              <button onClick={() => setShowCSVModal(false)} className="btn-secondary btn-sm" style={{ padding: '4px', borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
              Upload your employee CSV. The server validates required fields, unique code/email, valid email, known dept, ISO dates, and salary &gt; 0 before committing.
            </p>

            <div style={{ padding: '16px', border: '2px dashed var(--border-color)', borderRadius: '10px', textAlign: 'center', marginBottom: '16px' }}>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files[0])}
                style={{ display: 'block', margin: '0 auto', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button
                onClick={handleCSVDryRun}
                className="btn btn-secondary"
                disabled={!csvFile || csvLoading}
                style={{ flex: 1 }}
              >
                {csvLoading ? 'Validating...' : '1. Execute Dry Run Validation'}
              </button>

              <button
                onClick={handleCSVImport}
                className="btn btn-primary"
                disabled={!dryRunResult || dryRunResult.invalid_count > 0 || csvLoading}
                style={{ flex: 1 }}
              >
                {csvLoading ? 'Importing...' : '2. Confirm & Import All'}
              </button>
            </div>

            {/* Dry Run Feedback */}
            {dryRunResult && (
              <div style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span><b>Total Evaluated Rows:</b> {dryRunResult.total_rows}</span>
                  <span style={{ color: '#34d399' }}><b>Valid:</b> {dryRunResult.valid_count}</span>
                  <span style={{ color: '#fb7185' }}><b>Errors:</b> {dryRunResult.invalid_count}</span>
                </div>

                {dryRunResult.errors.length > 0 && (
                  <div style={{ maxHeight: '140px', overflowY: 'auto', background: 'rgba(244, 63, 94, 0.1)', padding: '10px', borderRadius: '6px', color: '#fb7185', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>Validation Errors Detected:</div>
                    {dryRunResult.errors.map((err, i) => (
                      <div key={i}>• Row {err.row} [{err.field}]: {err.reason}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {csvSuccess && (
              <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '10px', fontSize: '0.85rem' }}>
                <CheckCircle size={18} style={{ display: 'inline', marginRight: '6px' }} />
                {csvSuccess.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employee Self Update Modal */}
      {showSelfEditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Update Contact Info</h3>
              <button onClick={() => setShowSelfEditModal(false)} className="btn-secondary btn-sm" style={{ padding: '4px', borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSelfUpdate}>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  placeholder="+92 300 0000000"
                  value={selfPhone}
                  onChange={(e) => setSelfPhone(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  placeholder="Street, City, Postal Code"
                  value={selfAddress}
                  onChange={(e) => setSelfAddress(e.target.value)}
                  className="form-textarea"
                  rows={3}
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
