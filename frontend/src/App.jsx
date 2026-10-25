import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import SetupPage from './pages/SetupPage';
import LoginPage from './pages/LoginPage';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AIChatDrawer from './components/AIChatDrawer';
import ChangePasswordModal from './components/ChangePasswordModal';

// Main pages
import AdminDashboard from './pages/AdminDashboard';
import HRDashboard from './pages/HRDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeesPage from './pages/EmployeesPage';
import AttendancePage from './pages/AttendancePage';
import LeavePage from './pages/LeavePage';
import PayrollPage from './pages/PayrollPage';
import SettingsPage from './pages/SettingsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import AuditLogsPage from './pages/AuditLogsPage';

function AppContent() {
  const { user, token, loading, setupNeeded } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }, [isDark]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-main)',
        fontSize: '1.1rem',
        fontWeight: 600
      }}>
        Initializing HCM Lite System...
      </div>
    );
  }

  // 1. If First-run setup is required
  if (setupNeeded) {
    return <SetupPage />;
  }

  // 2. If not logged in
  if (!token || !user) {
    return <LoginPage />;
  }

  // Determine Dashboard View based on role
  function renderDashboard() {
    if (user.role === 'ADMIN') return <AdminDashboard />;
    if (user.role === 'HR') return <HRDashboard />;
    return <EmployeeDashboard onOpenAI={() => setIsAiOpen(true)} onNavigateTab={(tab) => setCurrentTab(tab)} />;
  }

  // Determine active page
  function renderActivePage() {
    switch (currentTab) {
      case 'dashboard':
        return renderDashboard();
      case 'employees':
        return <EmployeesPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'leave':
        return <LeavePage />;
      case 'payroll':
      case 'payslips':
        return <PayrollPage />;
      case 'announcements':
        return <AnnouncementsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'audit':
        return <AuditLogsPage />;
      default:
        return renderDashboard();
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Navbar */}
      <Navbar
        onOpenAI={() => setIsAiOpen(true)}
        onToggleTheme={() => setIsDark(!isDark)}
        isDark={isDark}
      />

      {/* Main layout with Sidebar and Page Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
        />
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
          {renderActivePage()}
        </main>
      </div>

      {/* Slide-over AI Assistant Drawer */}
      <AIChatDrawer
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
      />

      {/* Mandatory Password Change Modal for new/reset employee accounts */}
      {user?.must_change_password && (
        <ChangePasswordModal
          isOpen={true}
          isMandatory={true}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
