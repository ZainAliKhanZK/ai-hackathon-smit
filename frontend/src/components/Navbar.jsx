import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  Bell, Bot, LogOut, Sun, Moon, Sparkles, User, ShieldCheck, Check, Key
} from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

export default function Navbar({ onOpenAI, onToggleTheme, isDark }) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  async function loadNotifications() {
    try {
      const data = await api.listNotifications();
      setNotifications(data);
    } catch {
      // ignore
    }
  }

  async function handleMarkRead(id) {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {
      // ignore
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header style={{
      height: '64px',
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand logo & tagline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 800,
          fontSize: '1.2rem',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
        }}>
          H
        </div>
        <div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            HCM Lite
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Saylani Edition
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Ask AI button */}
        <button
          onClick={onOpenAI}
          className="btn btn-primary btn-sm"
          style={{ borderRadius: '20px', padding: '6px 14px' }}
        >
          <Sparkles size={15} />
          <span>Ask Assistant</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="btn-secondary btn-sm"
          style={{ padding: '6px', borderRadius: '50%' }}
          title="Toggle Theme"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="btn-secondary btn-sm"
            style={{ padding: '6px', borderRadius: '50%', position: 'relative' }}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#f43f5e',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div style={{
              position: 'absolute',
              top: '40px',
              right: 0,
              width: '300px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              padding: '12px',
              zIndex: 1000
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Notifications</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{notifications.length} total</span>
              </div>
              <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {notifications.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', padding: '16px 0' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        background: n.is_read ? 'transparent' : 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{n.title}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Role Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px',
          borderRadius: '20px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)'
        }}>
          <ShieldCheck size={16} style={{ color: user?.role === 'ADMIN' ? 'var(--accent-amber)' : user?.role === 'HR' ? 'var(--accent-primary)' : 'var(--accent-emerald)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              {user?.email?.split('@')[0]}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Change Password */}
        <button
          onClick={() => setShowPasswordModal(true)}
          className="btn-secondary btn-sm"
          style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Change Password"
        >
          <Key size={14} />
          <span style={{ fontSize: '0.8rem' }}>Password</span>
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="btn-secondary btn-sm"
          style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Sign Out"
        >
          <LogOut size={15} />
          <span style={{ fontSize: '0.8rem' }}>Logout</span>
        </button>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </header>
  );
}
