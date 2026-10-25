import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { X, User, Calendar, Clock, DollarSign, Award, FileText } from 'lucide-react';

export default function Employee360Modal({ employeeId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (employeeId) {
      loadData();
    }
  }, [employeeId]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.getEmployee360(employeeId);
      setData(res);
    } catch (err) {
      console.error("Failed to load 360 profile:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!employeeId) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '780px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <span className="badge badge-purple" style={{ marginBottom: '4px' }}>Employee 360° Profile</span>
            <h2 style={{ fontSize: '1.3rem', margin: 0 }}>
              {data ? `${data.profile.first_name} ${data.profile.last_name}` : 'Loading...'}
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {data ? `${data.profile.employee_code} • ${data.profile.designation || 'No Designation'} (${data.profile.department || 'No Dept'})` : ''}
            </span>
          </div>
          <button onClick={onClose} className="btn-secondary btn-sm" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab selection */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', paddingBottom: '8px' }}>
          <button
            onClick={() => setActiveTab('profile')}
            className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <User size={14} /> Profile & Job
          </button>
          <button
            onClick={() => setActiveTab('salary')}
            className={`btn btn-sm ${activeTab === 'salary' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <DollarSign size={14} /> Salary Structure
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`btn btn-sm ${activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Clock size={14} /> Attendance History
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`btn btn-sm ${activeTab === 'leaves' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Calendar size={14} /> Leave History
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading employee details...
          </div>
        ) : data && (
          <div>
            {activeTab === 'profile' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '16px' }}>
                  <div className="form-label" style={{ marginBottom: '8px' }}>Contact Information</div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}><b>Email:</b> {data.profile.email}</div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}><b>Phone:</b> {data.profile.phone || '-'}</div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}><b>Address:</b> {data.profile.address || '-'}</div>
                  <div style={{ fontSize: '0.9rem' }}><b>Gender:</b> {data.profile.gender}</div>
                </div>
                <div className="glass-panel" style={{ padding: '16px' }}>
                  <div className="form-label" style={{ marginBottom: '8px' }}>Employment Details</div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}><b>Join Date:</b> {data.profile.join_date}</div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}><b>Status:</b> <span className="badge badge-success">{data.profile.status}</span></div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}><b>Department:</b> {data.profile.department || '-'}</div>
                  <div style={{ fontSize: '0.9rem' }}><b>Designation:</b> {data.profile.designation || '-'}</div>
                </div>
              </div>
            )}

            {activeTab === 'salary' && (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ marginBottom: '14px', fontSize: '1rem' }}>Official Compensation Breakdown (Gross = 1.5 × Basic)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
                    <div className="form-label">Basic Salary</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>PKR {data.profile.salary.basic.toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
                    <div className="form-label">HRA (40%)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>PKR {data.profile.salary.hra.toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
                    <div className="form-label">Medical (10%)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-amber)' }}>PKR {data.profile.salary.medical.toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
                    <div className="form-label">Total Gross</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>PKR {data.profile.salary.gross.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Total Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_attendance.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No attendance records found</td></tr>
                    ) : (
                      data.recent_attendance.map((a, i) => (
                        <tr key={i}>
                          <td>{a.date}</td>
                          <td>{a.check_in || '-'}</td>
                          <td>{a.check_out || '-'}</td>
                          <td>{a.total_hours} hrs</td>
                          <td>
                            <span className={`badge ${a.status === 'PRESENT' ? 'badge-success' : a.status === 'LATE' ? 'badge-warning' : 'badge-danger'}`}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'leaves' && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Working Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_leaves.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No leave records found</td></tr>
                    ) : (
                      data.recent_leaves.map((l, i) => (
                        <tr key={i}>
                          <td><b>{l.type}</b></td>
                          <td>{l.start_date}</td>
                          <td>{l.end_date}</td>
                          <td>{l.working_days} d</td>
                          <td>{l.reason}</td>
                          <td>
                            <span className={`badge ${l.status === 'APPROVED' ? 'badge-success' : l.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
