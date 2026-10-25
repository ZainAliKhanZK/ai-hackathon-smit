import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Shield, Building2, Clock, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';

export default function SetupPage() {
  const { setSetupNeeded } = useAuth();
  const [formData, setFormData] = useState({
    company_name: 'Saylani Systems Ltd',
    admin_email: 'admin@hcmlite.com',
    admin_password: '',
    office_start: '09:00',
    grace_time_minutes: 15,
    half_day_hours: 5.0,
    weekend_days: 'Saturday,Sunday',
    office_latitude: 24.8607,
    office_longitude: 67.0011,
    office_radius_meters: 150.0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.admin_password || formData.admin_password.length < 6) {
      setError('Admin password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.firstRunSetup(formData);
      setSuccess(true);
      setTimeout(() => {
        setSetupNeeded(false);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(ellipse at top, #1e1b4b, #0b0f19)'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '680px',
        width: '100%',
        padding: '36px',
        borderRadius: 'var(--radius-lg)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'var(--accent-gradient)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            marginBottom: '12px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
          }}>
            <Building2 size={28} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>First-Run System Setup</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Initialize your HCM Lite instance. Create the initial company profile and Admin account.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fb7185',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={18} />
            <span>Company and Admin account initialized! Redirecting to login...</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Company Profile */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={16} /> 1. Company Profile
            </h3>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          </div>

          {/* Section 2: Admin Account */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} /> 2. Master Admin Account
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Admin Email</label>
                <input
                  type="email"
                  name="admin_email"
                  value={formData.admin_email}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Admin Password</label>
                <input
                  type="password"
                  name="admin_password"
                  value={formData.admin_password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  required
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Office Rules & Geofence */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> 3. Attendance Rules & Geofence
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Office Start</label>
                <input
                  type="text"
                  name="office_start"
                  value={formData.office_start}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Grace Time (mins)</label>
                <input
                  type="number"
                  name="grace_time_minutes"
                  value={formData.grace_time_minutes}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Half Day (&lt; hours)</label>
                <input
                  type="number"
                  step="0.5"
                  name="half_day_hours"
                  value={formData.half_day_hours}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Office Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  name="office_latitude"
                  value={formData.office_latitude}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Office Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  name="office_longitude"
                  value={formData.office_longitude}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Geofence Radius (m)</label>
                <input
                  type="number"
                  name="office_radius_meters"
                  value={formData.office_radius_meters}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
            disabled={loading || success}
          >
            {loading ? 'Setting up Company...' : 'Initialize HCM Lite'}
          </button>
        </form>
      </div>
    </div>
  );
}
