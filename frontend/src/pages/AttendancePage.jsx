import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import CameraAttendanceModal from '../components/CameraAttendanceModal';
import { getLocalDateString, formatDisplayDate } from '../utils/dateUtils';
import {
  Clock, CheckCircle, Camera, AlertTriangle, Calendar,
  Check, X, FileEdit, RefreshCw, MapPin, ChevronLeft, ChevronRight,
  Search, Users, UserCheck, UserX
} from 'lucide-react';

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Correction requests state
  const [corrections, setCorrections] = useState([]);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [reviewComment, setReviewComment] = useState({});

  const [corrForm, setCorrForm] = useState({
    date: getLocalDateString(),
    requested_check_in: '09:00:00',
    requested_check_out: '17:30:00',
    reason: ''
  });

  useEffect(() => {
    loadAttendance();
    loadCorrections();
  }, [selectedDate]);

  async function loadAttendance() {
    setLoading(true);
    try {
      const data = await api.getTodayAttendance(selectedDate);
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load attendance:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCorrections() {
    try {
      const data = await api.listCorrections();
      setCorrections(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }

  async function handleCheckIn(source = 'WEB') {
    try {
      await api.checkIn({ source });
      alert("Checked in successfully!");
      loadAttendance();
    } catch (err) {
      alert("Check in failed: " + err.message);
    }
  }

  async function handleCheckOut() {
    try {
      await api.checkOut({});
      alert("Checked out successfully!");
      loadAttendance();
    } catch (err) {
      alert("Check out failed: " + err.message);
    }
  }

  async function handleRequestCorrection(e) {
    e.preventDefault();
    try {
      await api.requestCorrection(corrForm);
      alert("Correction request submitted for HR approval!");
      setShowCorrectionModal(false);
      loadCorrections();
    } catch (err) {
      alert("Correction failed: " + err.message);
    }
  }

  async function handleReviewCorrection(id, status) {
    try {
      const comment = reviewComment[id] || (status === 'APPROVED' ? 'Approved by HR' : 'Rejected');
      await api.reviewCorrection(id, { status, reviewer_comment: comment });
      alert(`Correction ${status.toLowerCase()} successfully!`);
      loadCorrections();
      loadAttendance();
    } catch (err) {
      alert("Review failed: " + err.message);
    }
  }

  function shiftDate(days) {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(getLocalDateString(current));
  }

  function jumpToToday() {
    setSelectedDate(getLocalDateString());
  }

  const isEmployee = user?.role === 'EMPLOYEE';
  const myTodayRecord = isEmployee ? records.find(r => r.employee_id === user?.employee_id) : null;
  const isSelectedDateToday = selectedDate === getLocalDateString();

  // Metrics summary
  const stats = useMemo(() => {
    const total = records.length;
    let present = 0;
    let late = 0;
    let onLeave = 0;
    let notCheckedIn = 0;
    let absent = 0;

    for (const r of records) {
      const s = (r.status || '').toUpperCase();
      if (s === 'PRESENT') present++;
      else if (s === 'LATE') late++;
      else if (s.includes('LEAVE')) onLeave++;
      else if (s === 'NOT_CHECKED_IN') notCheckedIn++;
      else if (s === 'ABSENT') absent++;
      else if (s === 'HALF_DAY') present++;
    }

    return { total, present, late, onLeave, notCheckedIn, absent };
  }, [records]);

  // Filtered list
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Status filter
      if (statusFilter === 'PRESENT' && !(r.status === 'PRESENT' || r.status === 'HALF_DAY')) return false;
      if (statusFilter === 'LATE' && r.status !== 'LATE') return false;
      if (statusFilter === 'LEAVE' && !r.status?.includes('LEAVE')) return false;
      if (statusFilter === 'UNATTENDED' && !(r.status === 'NOT_CHECKED_IN' || r.status === 'ABSENT')) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (r.employee_name || '').toLowerCase().includes(q);
        const codeMatch = (r.employee_code || '').toLowerCase().includes(q);
        const deptMatch = (r.department_name || '').toLowerCase().includes(q);
        if (!nameMatch && !codeMatch && !deptMatch) return false;
      }

      return true;
    });
  }, [records, statusFilter, searchQuery]);

  return (
    <div style={{ padding: '28px', maxWidth: '1360px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="badge badge-info" style={{ marginBottom: '6px' }}>Time &amp; Attendance</span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
            {isEmployee ? 'My Attendance & Punches' : 'Daily Attendance Board'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            {formatDisplayDate(selectedDate)} • Office Hours: 09:00 AM (15m grace) • Half-day &lt; 5h
          </p>
        </div>

        {/* Date Controls & Punch Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {isEmployee && (
            <>
              {!myTodayRecord?.check_in && (
                <>
                  <button onClick={() => handleCheckIn('WEB')} className="btn btn-primary">
                    <Clock size={16} /> Web Check-In
                  </button>
                  <button
                    onClick={() => setShowCameraModal(true)}
                    className="btn btn-secondary"
                    style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                  >
                    <Camera size={16} /> Camera Check-In
                  </button>
                </>
              )}
              {myTodayRecord?.check_in && !myTodayRecord?.check_out && (
                <button onClick={handleCheckOut} className="btn btn-success">
                  <CheckCircle size={16} /> Check-Out Now
                </button>
              )}
              <button onClick={() => setShowCorrectionModal(true)} className="btn btn-secondary">
                <FileEdit size={16} /> Request Correction
              </button>
            </>
          )}

          {/* Quick Date Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => shiftDate(-1)}
              className="btn-secondary btn-sm"
              style={{ padding: '6px 8px' }}
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={jumpToToday}
              className={`btn btn-sm ${isSelectedDateToday ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            >
              Today
            </button>
            <button
              onClick={() => shiftDate(1)}
              className="btn-secondary btn-sm"
              style={{ padding: '6px 8px' }}
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
              style={{ width: '145px', padding: '4px 8px', fontSize: '0.8rem', border: 'none', background: 'transparent' }}
            />
          </div>

          <button
            onClick={loadAttendance}
            className="btn-secondary btn-sm"
            style={{ padding: '8px' }}
            title="Refresh Board"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip (for HR & Admin) */}
      {!isEmployee && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '22px' }}>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Employees</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>{stats.total}</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', textTransform: 'uppercase', fontWeight: 600 }}>Present Today</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>{stats.present}</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', textTransform: 'uppercase', fontWeight: 600 }}>Late Arrivals</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '4px' }}>{stats.late}</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#c084fc', textTransform: 'uppercase', fontWeight: 600 }}>On Leave</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c084fc', marginTop: '4px' }}>{stats.onLeave}</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: isSelectedDateToday ? 'var(--text-dim)' : '#fb7185', textTransform: 'uppercase', fontWeight: 600 }}>
              {isSelectedDateToday ? 'Not Checked In' : 'Absent'}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: isSelectedDateToday ? 'var(--text-main)' : '#fb7185', marginTop: '4px' }}>
              {isSelectedDateToday ? stats.notCheckedIn : stats.absent}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All (${records.length})` },
            { id: 'PRESENT', label: `Present (${stats.present})` },
            { id: 'LATE', label: `Late (${stats.late})` },
            { id: 'LEAVE', label: `On Leave (${stats.onLeave})` },
            { id: 'UNATTENDED', label: `${isSelectedDateToday ? 'Not Checked In' : 'Absent'} (${isSelectedDateToday ? stats.notCheckedIn : stats.absent})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '5px 12px', borderRadius: '16px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search employee or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="table-container glass-panel" style={{ marginBottom: '28px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Hours</th>
              <th>Source &amp; GPS</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '36px' }}>Loading attendance records...</td></tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                  No attendance records found matching your filters for {selectedDate}.
                </td>
              </tr>
            ) : (
              filteredRecords.map(r => (
                <tr key={`${r.employee_id}-${r.date}`}>
                  <td>
                    <b>{r.employee_name || 'Staff Member'}</b>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>{r.employee_code}</span>
                  </td>
                  <td>{r.department_name}</td>
                  <td>{r.date}</td>
                  <td><b>{r.check_in || '-'}</b></td>
                  <td><b>{r.check_out || (r.missing_checkout ? <span style={{ color: '#fb7185' }}>Missing</span> : '-')}</b></td>
                  <td>{r.total_hours ? `${r.total_hours} hrs` : '-'}</td>
                  <td>
                    {r.source !== '-' && (
                      <span className="badge badge-purple" style={{ marginRight: '6px' }}>{r.source}</span>
                    )}
                    {r.location_verified && (
                      <span className="badge badge-success" title="Within geofence">
                        <MapPin size={10} /> Verified
                      </span>
                    )}
                    {r.source === '-' && <span style={{ color: 'var(--text-dim)' }}>-</span>}
                  </td>
                  <td>
                    {r.status === 'PRESENT' && (
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={12} /> Present
                      </span>
                    )}
                    {r.status === 'LATE' && (
                      <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={12} /> Late
                      </span>
                    )}
                    {r.status === 'HALF_DAY' && (
                      <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> Half Day
                      </span>
                    )}
                    {r.status?.includes('LEAVE') && (
                      <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> On Leave
                      </span>
                    )}
                    {r.status === 'NOT_CHECKED_IN' && (
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> Not Checked In
                      </span>
                    )}
                    {r.status === 'ABSENT' && (
                      <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <X size={12} /> Absent
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Attendance Corrections Section */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileEdit size={18} style={{ color: 'var(--accent-primary)' }} />
          {user?.role === 'HR' ? 'Attendance Corrections Approval Inbox' : 'My Correction Requests'}
        </h3>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Target Date</th>
                <th>Requested In</th>
                <th>Requested Out</th>
                <th>Reason</th>
                <th>Status</th>
                {user?.role === 'HR' && <th style={{ textAlign: 'right' }}>HR Action</th>}
              </tr>
            </thead>
            <tbody>
              {corrections.length === 0 ? (
                <tr><td colSpan={user?.role === 'HR' ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>No correction requests.</td></tr>
              ) : (
                corrections.map(c => (
                  <tr key={c.id}>
                    <td><b>{c.employee_name || `Emp #${c.employee_id}`}</b></td>
                    <td>{c.date}</td>
                    <td>{c.requested_check_in || '-'}</td>
                    <td>{c.requested_check_out || '-'}</td>
                    <td>{c.reason}</td>
                    <td>
                      <span className={`badge ${c.status === 'APPROVED' ? 'badge-success' : c.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>
                        {c.status}
                      </span>
                    </td>
                    {user?.role === 'HR' && (
                      <td style={{ textAlign: 'right' }}>
                        {c.status === 'PENDING' ? (
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Comment..."
                              value={reviewComment[c.id] || ''}
                              onChange={(e) => setReviewComment({ ...reviewComment, [c.id]: e.target.value })}
                              className="form-input"
                              style={{ width: '130px', padding: '4px 8px', fontSize: '0.75rem' }}
                            />
                            <button onClick={() => handleReviewCorrection(c.id, 'APPROVED')} className="btn btn-success btn-sm">
                              <Check size={14} /> Approve
                            </button>
                            <button onClick={() => handleReviewCorrection(c.id, 'REJECTED')} className="btn btn-danger btn-sm">
                              <X size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {c.reviewer_comment || 'Decided'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Correction Modal */}
      {showCorrectionModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Request Attendance Correction</h3>
              <button onClick={() => setShowCorrectionModal(false)} className="btn-secondary btn-sm" style={{ padding: '4px', borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestCorrection}>
              <div className="form-group">
                <label className="form-label">Date to Correct</label>
                <input
                  type="date"
                  value={corrForm.date}
                  onChange={(e) => setCorrForm({ ...corrForm, date: e.target.value })}
                  required
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Requested Check-In</label>
                  <input
                    type="time"
                    step="1"
                    value={corrForm.requested_check_in}
                    onChange={(e) => setCorrForm({ ...corrForm, requested_check_in: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Requested Check-Out</label>
                  <input
                    type="time"
                    step="1"
                    value={corrForm.requested_check_out}
                    onChange={(e) => setCorrForm({ ...corrForm, requested_check_out: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason for Correction</label>
                <textarea
                  placeholder="e.g. Forgot to punch out due to client meeting"
                  value={corrForm.reason}
                  onChange={(e) => setCorrForm({ ...corrForm, reason: e.target.value })}
                  required
                  className="form-textarea"
                  rows={3}
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                Submit Correction Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Camera Attendance Modal */}
      <CameraAttendanceModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onSuccess={() => {
          alert("Camera Attendance marked successfully!");
          loadAttendance();
        }}
      />
    </div>
  );
}
