import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Clock, Calendar, DollarSign,
  Settings, Megaphone, FileText, UserCheck, Shield, ChevronRight
} from 'lucide-react';

export default function Sidebar({ currentTab, onSelectTab }) {
  const { user } = useAuth();
  const role = user?.role;

  const menuItems = [];

  // Common or role-specific items
  menuItems.push({
    id: 'dashboard',
    label: role === 'ADMIN' ? 'Company Dashboard' : role === 'HR' ? 'People Dashboard' : 'Self-Service Home',
    icon: LayoutDashboard
  });

  if (role === 'ADMIN' || role === 'HR') {
    menuItems.push({
      id: 'employees',
      label: 'Employees Directory',
      icon: Users
    });
  }

  menuItems.push({
    id: 'attendance',
    label: role === 'EMPLOYEE' ? 'Attendance & Check-in' : 'Attendance Board',
    icon: Clock
  });

  menuItems.push({
    id: 'leave',
    label: role === 'EMPLOYEE' ? 'Leave & Smart Apply' : 'Leave Management',
    icon: Calendar
  });

  if (role === 'ADMIN' || role === 'HR') {
    menuItems.push({
      id: 'payroll',
      label: role === 'ADMIN' ? 'Payroll & Lock' : 'Payroll Runs',
      icon: DollarSign
    });
  } else {
    menuItems.push({
      id: 'payslips',
      label: 'My Payslips',
      icon: DollarSign
    });
  }

  menuItems.push({
    id: 'announcements',
    label: 'Announcements',
    icon: Megaphone
  });

  if (role === 'ADMIN') {
    menuItems.push({
      id: 'settings',
      label: 'Company Settings',
      icon: Settings
    });
    menuItems.push({
      id: 'audit',
      label: 'Security & Audit Logs',
      icon: FileText
    });
  }

  return (
    <aside style={{
      width: '240px',
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(16px)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px',
      gap: '6px'
    }}>
      <div style={{
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-dim)',
        padding: '0 12px 10px',
        fontWeight: 700
      }}>
        Navigation • {role}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isActive ? 'var(--accent-primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
              onMouseOut={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={18} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight size={14} />}
            </button>
          );
        })}
      </nav>

      {/* Mini status footer */}
      <div style={{
        padding: '12px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
        fontSize: '0.75rem',
        color: 'var(--text-dim)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '2px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }}></span>
          System Online
        </div>
        <div>HCM Lite v1.0.0</div>
      </div>
    </aside>
  );
}
