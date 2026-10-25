import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import CameraAttendanceModal from '../components/CameraAttendanceModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import {
  Clock, CheckCircle, Camera, Calendar, DollarSign,
  Megaphone, AlertTriangle, ArrowRight, Sparkles, Download, Key
} from 'lucide-react';

export default function EmployeeDashboard({ onOpenAI, onNavigateTab }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await api.getEmployeeAnalytics();
      setData(res);
    } catch (err) {
      console.error("Employee dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleWebCheckIn() {
    setActionLoading(true);
    setMsg(null);
    try {
      await api.checkIn({ source: 'WEB' });
      setMsg({ type: 'success', text: 'Checked in successfully!' });
      await loadDashboard();
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Check-in failed' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleWebCheckOut() {
    setActionLoading(true);
    setMsg(null);
    try {
      await api.checkOut({});
      setMsg({ type: 'success', text: 'Checked out successfully!' });
      await loadDashboard();
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Check-out failed' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDownloadPayslip(id) {
    try {
      const blob = await api.downloadPayslipPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("Failed to download payslip PDF: " + err.message);
    }
  }

  if (loading && !data) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading your portal...</div>;
  }

  const att = data?.today_attendance || {};

  return (
    <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="badge badge-success" style={{ marginBottom: '6px' }}>Employee Self-Service</span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
            Hello, {user?.employee_info ? `${user.employee_info.first_name}` : user?.email?.split('@')[0]}!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {user?.employee_info?.designation || 'Staff'} • {user?.employee_info?.department || 'Operations'} ({user?.employee_info?.employee_code || '-'})
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="btn btn-secondary"
            style={{ borderRadius: '20px', padding: '8px 16px' }}
          >
            <Key size={15} />
            <span>Change Password</span>
          </button>
          <button
            onClick={onOpenAI}
            className="btn btn-primary"
            style={{ borderRadius: '20px', padding: '8px 16px' }}
          >
            <Sparkles size={16} />
            <span>Ask My Assistant</span>
          </button>
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: msg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          color: msg.type === 'success' ? '#34d399' : '#fb7185',
          border: `1px solid ${msg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.875rem'
        }}>
          {msg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Grid: Check-in Widget & Hours progress */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Check-in Widget */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: 'var(--accent-primary)' }} /> Today's Attendance Clock
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', marginBottom: '18px' }}>
            <div>
              <div className="form-label">Check In Status</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>
                {att.checked_in ? (
                  <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={16} /> In at {att.check_in_time} ({att.status})
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-dim)' }}>Not Checked In Yet</span>
                )}
              </div>
            </div>

            <div>
              <div className="form-label">Check Out</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>
                {att.checked_out ? (
                  <span style={{ color: 'var(--accent-blue)' }}>{att.check_out_time} ({att.total_hours} hrs)</span>
                ) : (
                  <span style={{ color: 'var(--text-dim)' }}>-</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {!att.checked_in ? (
              <>
                <button
                  onClick={handleWebCheckIn}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={actionLoading}
                >
                  Web Check-In
                </button>
                <button
                  onClick={() => setShowCameraModal(true)}
                  className="btn btn-secondary"
                  style={{ flex: 1, borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                >
                  <Camera size={16} /> Camera Check-In
                </button>
              </>
            ) : !att.checked_out ? (
              <button
                onClick={handleWebCheckOut}
                className="btn btn-success"
                style={{ width: '100%' }}
                disabled={actionLoading}
              >
                Check Out Now
              </button>
            ) : (
              <div style={{ width: '100%', textAlign: 'center', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: '8px', fontWeight: 600 }}>
                Attendance Completed for Today ({att.total_hours} hrs)
              </div>
            )}
          </div>
        </div>

        {/* Weekly Hours vs 40h & Late Counter */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '14px' }}>Weekly Work Hours &amp; Punctuality</h3>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hours this week vs 40h target:</span>
              <b>{data?.hours_this_week || 0} / 40.0 hrs</b>
            </div>
            <div style={{ height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, ((data?.hours_this_week || 0) / 40.0) * 100)}%`,
                background: 'var(--accent-gradient)',
                borderRadius: '5px'
              }}></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '10px' }}>
              <div className="form-label">Lates This Month</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px', color: (data?.late_count_month || 0) > 2 ? '#f43f5e' : 'var(--text-main)' }}>
                {data?.late_count_month || 0}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>3 lates = 0.5 day penalty</span>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '10px' }}>
              <div className="form-label">Latest Payslip</div>
              {data?.last_payslip ? (
                <>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>
                    PKR {data.last_payslip.net_salary.toLocaleString()}
                  </div>
                  <button
                    onClick={() => handleDownloadPayslip(data.last_payslip.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Download size={12} /> Download PDF
                  </button>
                </>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '8px' }}>No payroll runs yet</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--accent-primary)' }} /> Available Leave Quotas
          </h3>
          <button onClick={() => onNavigateTab('leave')} className="btn btn-secondary btn-sm">
            <span>Apply or Smart Leave</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {data?.leave_balances?.map((lb, i) => (
            <div key={i} style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>{lb.name}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {lb.quota > 0 ? lb.remaining : '∞'}
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-dim)', marginLeft: '4px' }}>
                  {lb.quota > 0 ? `/ ${lb.quota} days left` : 'Unlimited'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Used: {lb.used} days
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Announcements Feed */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Megaphone size={18} style={{ color: 'var(--accent-amber)' }} /> Company Notice Board
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data?.announcements?.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No announcements posted yet.</div>
          ) : (
            data?.announcements?.map(a => (
              <div key={a.id} style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '8px', borderLeft: a.priority === 'IMPORTANT' ? '4px solid #f43f5e' : '4px solid #6366f1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <b style={{ fontSize: '0.9rem' }}>{a.title}</b>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{a.date}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{a.content}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Camera Attendance Modal */}
      <CameraAttendanceModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onSuccess={() => {
          setMsg({ type: 'success', text: 'Camera & Geofence check-in verified!' });
          loadDashboard();
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
