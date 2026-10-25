import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Users, TrendingDown, DollarSign, Briefcase, Sparkles,
  ShieldCheck, RefreshCw, Filter
} from 'lucide-react';

export default function AdminDashboard() {
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
      const res = await api.getAdminAnalytics(selectedDept);
      setData(res);
    } catch (err) {
      console.error("Dashboard error:", err);
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
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Admin Dashboard...</div>;
  }

  const kpis = data?.kpis || {};

  return (
    <div style={{ padding: '28px', maxWidth: '1360px', margin: '0 auto' }}>
      {/* Top Banner with Filters & AI Summarize Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="badge badge-purple" style={{ marginBottom: '6px' }}>Company Level • Executive Overview</span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Executive Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Real-time aggregates across departments, attrition, and payroll.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Department filter */}
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

          {/* AI Summarize Button (Feature 20) */}
          <button
            onClick={handleSummarize}
            className="btn btn-primary"
            disabled={summaryLoading}
            style={{ borderRadius: '20px' }}
          >
            {summaryLoading ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
            <span>Summarize Insights</span>
          </button>
        </div>
      </div>

      {/* AI Summary Banner (When clicked) */}
      {aiSummary && (
        <div className="glass-panel" style={{
          padding: '18px 22px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(217, 70, 239, 0.08))',
          borderColor: 'rgba(99, 102, 241, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
            <Sparkles size={17} />
            <span>AI Executive Insights (Real Numbers Only)</span>
            <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>AI-generated</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
            {aiSummary.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 4 Core KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">Total Headcount</span>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '8px' }}>
            {kpis.headcount || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Active &amp; Probation</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">Attrition Rate (YTD)</span>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '8px' }}>
            {kpis.attrition_rate || 0}%
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Exits ÷ Avg Headcount</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">Monthly Payroll Cost</span>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '8px', color: '#34d399' }}>
            PKR {(kpis.payroll_cost || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sum of active Gross</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">Average Salary</span>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Briefcase size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '8px' }}>
            PKR {(kpis.avg_salary || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mean Gross per Employee</span>
        </div>
      </div>

      {/* Grid: Department Distribution & Payroll by Dept */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Headcount by Department */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '16px' }}>Headcount by Department</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data?.headcount_by_department?.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No department data registered yet.</div>
            ) : (
              data?.headcount_by_department?.map((d, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{d.department}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{d.count} employees</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${kpis.headcount ? (d.count / kpis.headcount) * 100 : 0}%`,
                      background: 'var(--accent-gradient)',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payroll Cost by Department */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '16px' }}>Payroll Expenditure by Department</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data?.payroll_by_department?.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No payroll data registered yet.</div>
            ) : (
              data?.payroll_by_department?.map((d, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{d.department}</span>
                    <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>PKR {d.cost.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${kpis.payroll_cost ? (d.cost / kpis.payroll_cost) * 100 : 0}%`,
                      background: '#10b981',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Grid: Gender, Tenure, and Recent Audit Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Gender Breakdown */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '14px' }}>Gender Diversity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data?.gender_distribution?.map((g, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{g.gender}</span>
                <span className="badge badge-info">{g.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tenure Breakdown */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '14px' }}>Tenure Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data?.tenure_distribution?.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.bracket}</span>
                <span className="badge badge-purple">{t.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Feed */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} style={{ color: 'var(--accent-primary)' }} /> Live Audit Feed
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
            {data?.recent_audit_feed?.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No audit records yet.</div>
            ) : (
              data?.recent_audit_feed?.map(a => (
                <div key={a.id} style={{ fontSize: '0.775rem', padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <b>{a.actor}</b>
                    <span style={{ color: 'var(--text-dim)' }}>{a.time}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>{a.action} on {a.entity}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
