import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { FileText, ShieldCheck, Filter, RefreshCw, Code } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDetails, setSelectedDetails] = useState(null);

  useEffect(() => {
    loadAuditLogs();
  }, [entityFilter, actionFilter]);

  async function loadAuditLogs() {
    setLoading(true);
    try {
      let params = 'limit=100';
      if (entityFilter) params += `&entity=${entityFilter}`;
      if (actionFilter) params += `&action=${actionFilter}`;
      const data = await api.listAuditLogs(params);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '28px', maxWidth: '1360px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="badge badge-purple" style={{ marginBottom: '6px' }}>Immutable Security Ledger</span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>System Audit Logs</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Permanent trail of all create, update, approve, and finalize actions with before/after state diffs.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="form-select"
            style={{ width: '160px' }}
          >
            <option value="">All Entities</option>
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="PAYROLL">PAYROLL</option>
            <option value="LEAVE">LEAVE</option>
            <option value="SETTINGS">SETTINGS</option>
            <option value="ATTENDANCE">ATTENDANCE</option>
            <option value="AUTH">AUTH</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="form-select"
            style={{ width: '150px' }}
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="APPROVE">APPROVE</option>
            <option value="FINALIZE">FINALIZE</option>
            <option value="REJECT">REJECT</option>
          </select>

          <button onClick={loadAuditLogs} className="btn btn-secondary btn-sm" title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-container glass-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Role</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>State Diff / Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>Loading audit logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>No audit events logged yet.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id}>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </td>
                  <td><b>{log.actor_name}</b></td>
                  <td>
                    <span className={`badge ${log.actor_role === 'ADMIN' ? 'badge-warning' : log.actor_role === 'HR' ? 'badge-info' : 'badge-purple'}`}>
                      {log.actor_role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${log.action === 'CREATE' ? 'badge-success' : log.action === 'FINALIZE' ? 'badge-purple' : log.action === 'APPROVE' ? 'badge-info' : 'badge-warning'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td><b>{log.entity}</b></td>
                  <td><code style={{ fontSize: '0.8rem' }}>{log.entity_id || '-'}</code></td>
                  <td>
                    {log.details ? (
                      <button
                        onClick={() => setSelectedDetails(log.details)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.725rem', padding: '3px 8px' }}
                      >
                        <Code size={12} /> View JSON Diff
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>None</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>State Change Before / After Diff</h3>
            <pre style={{
              background: '#050811',
              padding: '16px',
              borderRadius: '8px',
              color: '#38bdf8',
              fontSize: '0.8rem',
              overflowX: 'auto',
              maxHeight: '360px',
              border: '1px solid var(--border-color)'
            }}>
              {JSON.stringify(JSON.parse(selectedDetails), null, 2)}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setSelectedDetails(null)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
