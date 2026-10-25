import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Plus, CheckCircle, AlertTriangle, Send } from 'lucide-react';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'NORMAL'
  });
  const [showPostModal, setShowPostModal] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const data = await api.listAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error("Failed to load announcements:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePost(e) {
    e.preventDefault();
    try {
      await api.postAnnouncement(form);
      setForm({ title: '', content: '', priority: 'NORMAL' });
      setShowPostModal(false);
      loadAnnouncements();
    } catch (err) {
      alert("Failed to post announcement: " + err.message);
    }
  }

  const canPost = user?.role === 'ADMIN' || user?.role === 'HR';

  return (
    <div style={{ padding: '28px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="badge badge-warning" style={{ marginBottom: '6px' }}>Internal Communications</span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Company Announcements</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Broadcast policy updates, company holidays, and town hall events.
          </p>
        </div>

        {canPost && (
          <button onClick={() => setShowPostModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Post New Announcement</span>
          </button>
        )}
      </div>

      {/* Announcements List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No company announcements posted yet.
          </div>
        ) : (
          announcements.map(a => (
            <div
              key={a.id}
              className="glass-panel"
              style={{
                padding: '20px 24px',
                borderLeft: a.priority === 'IMPORTANT' ? '4px solid #f43f5e' : '4px solid #6366f1'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px 0' }}>{a.title}</h3>
                  <span className={`badge ${a.priority === 'IMPORTANT' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                    {a.priority}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {new Date(a.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {a.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Post Modal */}
      {showPostModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Broadcast Announcement</h3>
            <form onSubmit={handlePost}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Office Closed on Friday for Public Holiday"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Priority Level</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="form-select"
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="IMPORTANT">Important (High Priority Banner)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Message Content</label>
                <textarea
                  placeholder="Enter details of announcement..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                  className="form-textarea"
                  rows={5}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowPostModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Send size={15} /> Post Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
