import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Users, CheckCircle, Clock, Calendar, AlertCircle,
  Sparkles, RefreshCw, Filter, ArrowUpRight
} from 'lucide-react';

export default function HRDashboard() {
  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    loadDepartments();
    loadDashboard();
  }, [selectedDept]);

  async function loadDepartments() {
    try {
      const depts = await api.listDepartments();
      setDepartments(depts);
    } catch {
      // ignore
    }
  }

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await api.getHRAnalytics(selectedDept);
      setData(res);
    } catch (err) {
      console.error("HR Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSummarize() {
    if (!data?.kpis) return;
    setSummaryLoading(true);
    try {
      const res = await api.aiDashboardSummary(data.kpis);
      setAiSummary(res.summary_bullets);
    } catch (err) {
      console.error("AI Summarize error:", err);
    } finally {
      setSummaryLoading(false);
    }
  }

  if (loading && !data) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading HR Operations Dashboard...</div>;
  }

  const kpis = data?.kpis || {};

  return (
    <div style={{ padding: '28px', maxWidth: '1360px', margin: '0 auto' }}>
      {/* Top Banner with Filters & AI Summarize Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="badge badge-info" style={{ marginBottom: '6px' }}>HR Operations • People Team</span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>HR Daily Operations</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Daily attendance roster, leave approvals, and punctuality monitoring.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} style={{ color: 'var(--text-dim)' }} />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="form-select"
              style={{ width: '180px', padding: '7px 12px', fontSize: '0.85rem' }}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSummarize}
            className="btn btn-primary"
            disabled={summaryLoading}
            style={{ borderRadius: '20px' }}
          >
            {summaryLoading ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
            <span>Summarize Operations</span>
          </button>
        </div>
      </div>

      {/* AI Summary Banner */}
      {aiSummary && (
        <div className="glass-panel" style={{
          padding: '18px 22px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(99, 102, 241, 0.08))',
          borderColor: 'rgba(6, 182, 212, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-secondary)', fontWeight: 700, fontSize: '0.9rem' }}>
            <Sparkles size={17} />
            <span>AI Operations Digest</span>
            <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>AI-generated</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
            {aiSummary.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 5 HR KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div className="form-label">Active Headcount</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px' }}>{kpis.headcount || 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered staff</span>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div className="form-label" style={{ color: 'var(--accent-emerald)' }}>Present Today</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: 'var(--accent-emerald)' }}>{kpis.present_today || 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>On time or half-day</span>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div className="form-label" style={{ color: 'var(--accent-amber)' }}>Late Today (&gt; 09:15)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: 'var(--accent-amber)' }}>{kpis.late_today || 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Past grace time</span>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div className="form-label" style={{ color: 'var(--accent-blue)' }}>On Leave Today</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: 'var(--accent-blue)' }}>{kpis.on_leave_today || 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approved leaves</span>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div className="form-label" style={{ color: 'var(--accent-rose)' }}>Pending Approvals</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: 'var(--accent-rose)' }}>{kpis.pending_approvals || 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Needs HR review</span>
        </div>
      </div>

      {/* Grid: Top 5 Late Comers & Leave by Type */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Top 5 Late Comers */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '16px' }}>Top 5 Late Arrivals This Month</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Times Late</th>
                  <th>Penalty Rule</th>
                </tr>
              </thead>
              <tbody>
                {data?.top_late_comers?.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No late records this month! Excellent punctuality.</td></tr>
                ) : (
                  data?.top_late_comers?.map((t, i) => (
                    <tr key={i}>
                      <td><b>{t.employee_name}</b></td>
                      <td>{t.department}</td>
                      <td>
                        <span className="badge badge-warning">{t.late_count} times</span>
                      </td>
                      <td>
                        {t.late_count >= 3 ? (
                          <span className="badge badge-danger">Deduct {(Math.floor(t.late_count / 3) * 0.5)} day</span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>No penalty</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leave Utilization by Type */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '16px' }}>Leave Utilization by Type</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {data?.leave_by_type?.map((lt, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{lt.type}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {lt.days} days used {lt.quota > 0 ? `/ ${lt.quota} quota` : '(Unlimited)'}
                  </span>
                </div>
                {lt.quota > 0 && (
                  <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (lt.days / lt.quota) * 100)}%`,
                      background: (lt.days / lt.quota) > 0.8 ? '#f43f5e' : '#6366f1',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance Trend (Last 7 Days) */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '16px' }}>Workforce Attendance Trend (Past 7 Days)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
          {data?.attendance_trend?.map((d, i) => (
            <div key={i} style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '6px' }}>{d.date.slice(5)}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{d.present}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Present</div>
              {d.late > 0 && (
                <span className="badge badge-warning" style={{ fontSize: '0.65rem', marginTop: '6px' }}>
                  {d.late} late
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
