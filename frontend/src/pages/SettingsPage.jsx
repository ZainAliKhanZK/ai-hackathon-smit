import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Settings, Building2, Clock, Users, Calendar, Shield,
  Plus, CheckCircle, AlertTriangle, Key, Power
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);

  // 1. Settings state
  const [companySettings, setCompanySettings] = useState({
    company_name: '',
    office_start: '09:00',
    grace_time_minutes: 15,
    half_day_hours: 5.0,
    weekend_days: 'Saturday,Sunday',
    office_latitude: 24.8607,
    office_longitude: 67.0011,
    office_radius_meters: 150.0
  });

  // 2. Org structures
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [users, setUsers] = useState([]);

  // Forms
  const [newDept, setNewDept] = useState({ name: '', code: '' });
  const [newDesig, setNewDesig] = useState({ title: '', department_id: '' });
  const [newLeaveType, setNewLeaveType] = useState({ name: '', quota: 10 });
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });
  const [newHR, setNewHR] = useState({ email: '', password: '' });

  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadAllSettings();
  }, []);

  async function loadAllSettings() {
    setLoading(true);
    try {
      const [settings, depts, desigs, lTypes, hols, uList] = await Promise.all([
        api.getCompanySettings(),
        api.listDepartments(),
        api.listDesignations(),
        api.listLeaveTypes(),
        api.listHolidays(),
        api.listUsers()
      ]);
      setCompanySettings(settings);
      setDepartments(depts);
      setDesignations(desigs);
      setLeaveTypes(lTypes);
      setHolidays(hols);
      setUsers(uList);
      if (depts.length > 0) {
        setNewDesig(prev => ({ ...prev, department_id: depts[0].id }));
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    try {
      const updated = await api.updateCompanySettings(companySettings);
      setCompanySettings(updated);
      setFeedback({ type: 'success', text: 'Company rules updated successfully!' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  }

  async function handleCreateDept(e) {
    e.preventDefault();
    try {
      await api.createDepartment(newDept);
      setNewDept({ name: '', code: '' });
      setFeedback({ type: 'success', text: 'Department created!' });
      loadAllSettings();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  }

  async function handleCreateDesig(e) {
    e.preventDefault();
    try {
      await api.createDesignation({
        title: newDesig.title,
        department_id: parseInt(newDesig.department_id)
      });
      setNewDesig(prev => ({ ...prev, title: '' }));
      setFeedback({ type: 'success', text: 'Designation created!' });
      loadAllSettings();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  }

  async function handleCreateLeaveType(e) {
    e.preventDefault();
    try {
      await api.createLeaveType({
        name: newLeaveType.name,
        quota: parseInt(newLeaveType.quota)
      });
      setNewLeaveType({ name: '', quota: 10 });
      setFeedback({ type: 'success', text: 'Leave Type created!' });
      loadAllSettings();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  }

  async function handleCreateHoliday(e) {
    e.preventDefault();
    try {
      await api.createHoliday(newHoliday);
      setNewHoliday({ name: '', date: '' });
      setFeedback({ type: 'success', text: 'Holiday added!' });
      loadAllSettings();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  }

  async function handleCreateHR(e) {
    e.preventDefault();
    try {
      await api.createHRLogin(newHR.email, newHR.password);
      setNewHR({ email: '', password: '' });
      setFeedback({ type: 'success', text: 'HR Login account created!' });
      loadAllSettings();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  }

  async function handleToggleUserStatus(userId, currentStatus) {
    try {
      await api.toggleUserStatus(userId, !currentStatus);
      loadAllSettings();
    } catch (err) {
      alert("Status toggle failed: " + err.message);
    }
  }

  async function handleResetPassword(userId) {
    try {
      const res = await api.resetUserPassword(userId);
      alert(`Password for ${res.email} reset! New Temporary Password: ${res.temporary_password}`);
      loadAllSettings();
    } catch (err) {
      alert("Password reset failed: " + err.message);
    }
  }

  return (
    <div style={{ padding: '28px', maxWidth: '1360px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <span className="badge badge-purple" style={{ marginBottom: '6px' }}>System Configuration</span>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Company Setup &amp; Organization</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Configure work rules, departments, leave quotas, holidays, and user logins.
        </p>
      </div>

      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          color: feedback.type === 'success' ? '#34d399' : '#fb7185',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.875rem'
        }}>
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('company')}
          className={`btn btn-sm ${activeTab === 'company' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Building2 size={15} /> Company Rules &amp; Geofence
        </button>
        <button
          onClick={() => setActiveTab('structure')}
          className={`btn btn-sm ${activeTab === 'structure' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Users size={15} /> Departments &amp; Designations
        </button>
        <button
          onClick={() => setActiveTab('quotas')}
          className={`btn btn-sm ${activeTab === 'quotas' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Calendar size={15} /> Leave Quotas &amp; Holidays
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Shield size={15} /> HR &amp; User Accounts
        </button>
      </div>

      {/* Tab 1: Company Rules & Geofence (Feature 03) */}
      {activeTab === 'company' && (
        <div className="glass-panel" style={{ padding: '24px', maxWidth: '780px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Company Settings &amp; Geofence Radius</h3>
          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                value={companySettings.company_name}
                onChange={(e) => setCompanySettings({ ...companySettings, company_name: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Office Start Time</label>
                <input
                  type="text"
                  value={companySettings.office_start}
                  onChange={(e) => setCompanySettings({ ...companySettings, office_start: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Grace Period (Minutes)</label>
                <input
                  type="number"
                  value={companySettings.grace_time_minutes}
                  onChange={(e) => setCompanySettings({ ...companySettings, grace_time_minutes: parseInt(e.target.value) })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Half-Day Threshold (&lt; Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  value={companySettings.half_day_hours}
                  onChange={(e) => setCompanySettings({ ...companySettings, half_day_hours: parseFloat(e.target.value) })}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Weekend Days (Comma-separated)</label>
              <input
                type="text"
                value={companySettings.weekend_days}
                onChange={(e) => setCompanySettings({ ...companySettings, weekend_days: e.target.value })}
                className="form-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Office Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={companySettings.office_latitude}
                  onChange={(e) => setCompanySettings({ ...companySettings, office_latitude: parseFloat(e.target.value) })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Office Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={companySettings.office_longitude}
                  onChange={(e) => setCompanySettings({ ...companySettings, office_longitude: parseFloat(e.target.value) })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Geofence Radius (Meters)</label>
                <input
                  type="number"
                  value={companySettings.office_radius_meters}
                  onChange={(e) => setCompanySettings({ ...companySettings, office_radius_meters: parseFloat(e.target.value) })}
                  className="form-input"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>
              Save Company Rules
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Departments & Designations (Feature 04) */}
      {activeTab === 'structure' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
          {/* Departments */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Departments</h3>
            <form onSubmit={handleCreateDept} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Dept Name (e.g. Engineering)"
                value={newDept.name}
                onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                required
                className="form-input"
                style={{ flex: 2 }}
              />
              <input
                type="text"
                placeholder="Code (ENG)"
                value={newDept.code}
                onChange={(e) => setNewDept({ ...newDept, code: e.target.value })}
                required
                className="form-input"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Add
              </button>
            </form>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Code</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(d => (
                    <tr key={d.id}>
                      <td><b>{d.name}</b></td>
                      <td><span className="badge badge-purple">{d.code}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Designations */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Designations</h3>
            <form onSubmit={handleCreateDesig} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Title (e.g. Senior Software Engineer)"
                value={newDesig.title}
                onChange={(e) => setNewDesig({ ...newDesig, title: e.target.value })}
                required
                className="form-input"
                style={{ flex: 2 }}
              />
              <select
                value={newDesig.department_id}
                onChange={(e) => setNewDesig({ ...newDesig, department_id: e.target.value })}
                className="form-select"
                style={{ flex: 1 }}
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Add
              </button>
            </form>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Designation</th>
                    <th>Department</th>
                  </tr>
                </thead>
                <tbody>
                  {designations.map(d => (
                    <tr key={d.id}>
                      <td><b>{d.title}</b></td>
                      <td>{d.department_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Leave Quotas & Holidays (Feature 04) */}
      {activeTab === 'quotas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
          {/* Leave Quotas */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Leave Types &amp; Quotas</h3>
            <form onSubmit={handleCreateLeaveType} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Leave Name (e.g. Maternity)"
                value={newLeaveType.name}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, name: e.target.value })}
                required
                className="form-input"
                style={{ flex: 2 }}
              />
              <input
                type="number"
                placeholder="Quota (Days)"
                value={newLeaveType.quota}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, quota: e.target.value })}
                required
                className="form-input"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Add
              </button>
            </form>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Annual Quota</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveTypes.map(l => (
                    <tr key={l.id}>
                      <td><b>{l.name}</b></td>
                      <td>{l.quota > 0 ? `${l.quota} days/year` : 'Unlimited'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Public Holidays */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Public Holidays</h3>
            <form onSubmit={handleCreateHoliday} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Holiday Name (e.g. Pakistan Day)"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                required
                className="form-input"
                style={{ flex: 2 }}
              />
              <input
                type="date"
                value={newHoliday.date}
                onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                required
                className="form-input"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Add
              </button>
            </form>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Holiday</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.length === 0 ? (
                    <tr><td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No holidays added yet</td></tr>
                  ) : (
                    holidays.map(h => (
                      <tr key={h.id}>
                        <td><b>{h.name}</b></td>
                        <td>{h.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: HR Users & Access Control (Feature 05) */}
      {activeTab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
          {/* Create HR Login */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Create New HR Login Account</h3>
            <form onSubmit={handleCreateHR}>
              <div className="form-group">
                <label className="form-label">HR Email</label>
                <input
                  type="email"
                  placeholder="hr@company.com"
                  value={newHR.email}
                  onChange={(e) => setNewHR({ ...newHR, email: e.target.value })}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Initial Password</label>
                <input
                  type="password"
                  placeholder="Password"
                  value={newHR.password}
                  onChange={(e) => setNewHR({ ...newHR, password: e.target.value })}
                  required
                  className="form-input"
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Create HR Login
              </button>
            </form>
          </div>

          {/* User Logins List */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>All System Accounts</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Active</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td><b>{u.email}</b></td>
                      <td>
                        <span className={`badge ${u.role === 'ADMIN' ? 'badge-warning' : u.role === 'HR' ? 'badge-info' : 'badge-purple'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {u.role !== 'ADMIN' && (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                              className="btn btn-secondary btn-sm"
                              title={u.is_active ? "Deactivate" : "Activate"}
                            >
                              <Power size={13} style={{ color: u.is_active ? '#fb7185' : '#34d399' }} />
                            </button>
                            <button
                              onClick={() => handleResetPassword(u.id)}
                              className="btn btn-secondary btn-sm"
                              title="Reset Password"
                            >
                              <Key size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
