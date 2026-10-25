import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Calendar, Check, X, Sparkles, Send, AlertTriangle,
  Clock, CheckCircle, Info, ArrowRight
} from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';

export default function LeavePage() {
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);

  // Smart leave NLP input
  const [smartPrompt, setSmartPrompt] = useState('');
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartInsight, setSmartInsight] = useState(null);

  // Leave Form
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: getLocalDateString(),
    end_date: getLocalDateString(),
    reason: ''
  });
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [reviewComments, setReviewComments] = useState({});

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const types = await api.listLeaveTypes();
      setLeaveTypes(types);
      if (types.length > 0 && !formData.leave_type_id) {
        setFormData(prev => ({ ...prev, leave_type_id: types[0].id }));
      }

      if (user?.role === 'EMPLOYEE' || user?.employee_id) {
        const [b, reqs] = await Promise.all([
          api.getLeaveBalances(user?.employee_id),
          api.getMyLeaveRequests()
        ]);
        setBalances(b);
        setMyRequests(reqs);
      }

      if (user?.role === 'HR' || user?.role === 'ADMIN') {
        const inboxData = await api.getLeaveInbox();
        setInbox(inboxData);
      }
    } catch (err) {
      console.error("Failed to load leave data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSmartLeaveNLP() {
    if (!smartPrompt.trim()) return;
    setSmartLoading(true);
    setSmartInsight(null);
    setFormError(null);

    try {
      const res = await api.aiSmartLeave(smartPrompt);
      setFormData({
        leave_type_id: res.leave_type_id || leaveTypes[0]?.id || 1,
        start_date: res.start_date || formData.start_date,
        end_date: res.end_date || formData.end_date,
        reason: res.reason || smartPrompt
      });
      setSmartInsight(res.raw_understanding);
    } catch (err) {
      setFormError("AI parsing error: " + err.message);
    } finally {
      setSmartLoading(false);
    }
  }

  async function handleApplyLeave(e) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      const payload = {
        leave_type_id: parseInt(formData.leave_type_id),
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason
      };
      await api.applyLeave(payload);
      setFormSuccess("Leave request submitted successfully for HR approval!");
      setFormData(prev => ({ ...prev, reason: '' }));
      setSmartPrompt('');
      setSmartInsight(null);
      loadAll();
    } catch (err) {
      setFormError(err.message || "Failed to submit leave request");
    }
  }

  async function handleCancelLeave(id) {
    if (!window.confirm("Are you sure you want to cancel this leave request?")) return;
    try {
      await api.cancelLeave(id);
      alert("Leave request cancelled.");
      loadAll();
    } catch (err) {
      alert("Failed to cancel leave: " + err.message);
    }
  }

  async function handleReviewLeave(id, status) {
    try {
      const comment = reviewComments[id] || (status === 'APPROVED' ? 'Approved by HR' : 'Rejected');
      await api.reviewLeave(id, { status, reviewer_comment: comment });
      alert(`Leave request ${status.toLowerCase()} successfully!`);
      loadAll();
    } catch (err) {
      alert("Review failed: " + err.message);
    }
  }

  return (
    <div style={{ padding: '28px', maxWidth: '1360px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <span className="badge badge-purple" style={{ marginBottom: '6px' }}>Time Off &amp; Quotas</span>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Leave Management</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Working days only (weekends and holidays automatically excluded). Overlap or over-balance rejected with Error 422.
        </p>
      </div>

      {/* HR Approval Inbox (Feature 13) */}
      {(user?.role === 'HR' || user?.role === 'ADMIN') && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
              HR Leave Approval Inbox ({inbox.length} Pending)
            </h3>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Working Days</th>
                  <th>Reason</th>
                  <th style={{ textAlign: 'right' }}>HR Decision</th>
                </tr>
              </thead>
              <tbody>
                {inbox.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>Inbox zero! No pending leave requests.</td></tr>
                ) : (
                  inbox.map(req => (
                    <tr key={req.id}>
                      <td><b>{req.employee_name}</b></td>
                      <td><span className="badge badge-purple">{req.leave_type_name}</span></td>
                      <td>{req.start_date}</td>
                      <td>{req.end_date}</td>
                      <td><b>{req.working_days} days</b></td>
                      <td>{req.reason}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Decision comment..."
                            value={reviewComments[req.id] || ''}
                            onChange={(e) => setReviewComments({ ...reviewComments, [req.id]: e.target.value })}
                            className="form-input"
                            style={{ width: '130px', padding: '4px 8px', fontSize: '0.75rem' }}
                          />
                          <button onClick={() => handleReviewLeave(req.id, 'APPROVED')} className="btn btn-success btn-sm">
                            <Check size={14} /> Approve
                          </button>
                          <button onClick={() => handleReviewLeave(req.id, 'REJECTED')} className="btn btn-danger btn-sm">
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Section: Balances & Smart Apply Form */}
      {(user?.role === 'EMPLOYEE' || user?.employee_id) && (
        <>
          {/* Leave Quota Balances */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {balances.map((b, i) => (
              <div key={i} className="glass-panel" style={{ padding: '18px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>{b.name}</div>
                <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  {b.quota > 0 ? b.remaining : '∞'}
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-dim)', marginLeft: '4px' }}>
                    {b.quota > 0 ? `/ ${b.quota} left` : 'Unlimited'}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Used: {b.used} days
                </div>
              </div>
            ))}
          </div>

          {/* Smart Leave NLP & Application Card */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
            {/* Feature 21: Smart Leave Natural Language Box */}
            <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(217, 70, 239, 0.1))', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.95rem' }}>
                <Sparkles size={18} />
                <span>Smart Leave Assistant (Natural Language &amp; Roman Urdu)</span>
                <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Feature 21</span>
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Type a sentence in plain words, and AI will automatically identify leave type, calculate calendar dates, and pre-fill your form.
              </p>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder='e.g., "Need next Monday and Tuesday off for sister wedding" or "Mujhe kal chutti chahiye doctor k pas jana hai"'
                  value={smartPrompt}
                  onChange={(e) => setSmartPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSmartLeaveNLP(); } }}
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleSmartLeaveNLP}
                  disabled={smartLoading || !smartPrompt.trim()}
                  className="btn btn-primary"
                >
                  <Sparkles size={15} />
                  <span>{smartLoading ? 'Parsing...' : 'Smart Pre-Fill'}</span>
                </button>
              </div>

              {smartInsight && (
                <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={14} />
                  <span>{smartInsight}</span>
                </div>
              )}
            </div>

            {/* Error or Success feedback */}
            {formError && (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleApplyLeave}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Leave Category</label>
                  <select
                    value={formData.leave_type_id}
                    onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                    className="form-select"
                    required
                  >
                    {leaveTypes.map(lt => (
                      <option key={lt.id} value={lt.id}>{lt.name} (Quota: {lt.quota > 0 ? lt.quota : 'Unlimited'})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason</label>
                <input
                  type="text"
                  placeholder="State the reason for leave"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                <button type="submit" className="btn btn-primary">
                  <Send size={15} />
                  <span>Submit Leave Request</span>
                </button>
              </div>
            </form>
          </div>

          {/* My Leave Requests History */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>My Leave Application History</h3>
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
                    <th>HR Comment</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>No leave requests submitted yet.</td></tr>
                  ) : (
                    myRequests.map(r => (
                      <tr key={r.id}>
                        <td><b>{r.leave_type_name}</b></td>
                        <td>{r.start_date}</td>
                        <td>{r.end_date}</td>
                        <td>{r.working_days} d</td>
                        <td>{r.reason}</td>
                        <td>
                          <span className={`badge ${r.status === 'APPROVED' ? 'badge-success' : r.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td>{r.reviewer_comment || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          {r.status === 'PENDING' && (
                            <button onClick={() => handleCancelLeave(r.id)} className="btn btn-danger btn-sm">
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
