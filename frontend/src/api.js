const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('hcm_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('hcm_token', token);
  } else {
    localStorage.removeItem('hcm_token');
  }
}

export function getStoredUser() {
  const user = localStorage.getItem('hcm_user');
  return user ? JSON.parse(user) : null;
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('hcm_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('hcm_user');
  }
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, set Content-Type to JSON
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Read body ONCE for the error message
    let errorDetail = 'Request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      try {
        errorDetail = await response.text();
      } catch {
        errorDetail = `HTTP ${response.status}`;
      }
    }

    // Handle 401 AFTER body is read
    if (response.status === 401) {
      setAuthToken(null);
      setStoredUser(null);
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/setup')) {
        window.location.href = '/login';
      }
    }

    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }

  // Handle binary / non-JSON responses
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/pdf') || contentType.includes('text/csv'))) {
    return response.blob();
  }

  return response.json();
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  put: (endpoint, body) => request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body)
  }),
  patch: (endpoint, body) => request(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),

  // Setup
  checkSetupStatus: () => request('/setup/status'),
  firstRunSetup: (data) => request('/setup/first-run', { method: 'POST', body: JSON.stringify(data) }),

  // Auth
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  getMe: () => request('/auth/me'),
  changePassword: (old_password, new_password) => request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ old_password, new_password })
  }),
  createHRLogin: (email, password) => request('/auth/users/hr', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  listUsers: () => request('/auth/users'),
  toggleUserStatus: (userId, isActive) => request(`/auth/users/${userId}/status?is_active=${isActive}`, { method: 'PATCH' }),
  resetUserPassword: (userId) => request(`/auth/users/${userId}/reset-password`, { method: 'POST' }),

  // Org Setup
  getCompanySettings: () => request('/org/settings'),
  updateCompanySettings: (data) => request('/org/settings', { method: 'PUT', body: JSON.stringify(data) }),
  listDepartments: () => request('/org/departments'),
  createDepartment: (data) => request('/org/departments', { method: 'POST', body: JSON.stringify(data) }),
  listDesignations: () => request('/org/designations'),
  createDesignation: (data) => request('/org/designations', { method: 'POST', body: JSON.stringify(data) }),
  listLeaveTypes: () => request('/org/leave-types'),
  createLeaveType: (data) => request('/org/leave-types', { method: 'POST', body: JSON.stringify(data) }),
  listHolidays: () => request('/org/holidays'),
  createHoliday: (data) => request('/org/holidays', { method: 'POST', body: JSON.stringify(data) }),

  // Employees
  registerEmployee: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  listEmployees: (params = '') => request(`/employees?${params}`),
  getEmployee360: (id) => request(`/employees/${id}/360`),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  selfUpdateProfile: (data) => request('/employees/me/self-update', { method: 'PATCH', body: JSON.stringify(data) }),
  csvDryRun: (formData) => request('/employees/csv-dry-run', { method: 'POST', body: formData }),
  csvImport: (formData) => request('/employees/csv-import', { method: 'POST', body: formData }),

  // Attendance
  checkIn: (data) => request('/attendance/check-in', { method: 'POST', body: JSON.stringify(data) }),
  checkOut: (data) => request('/attendance/check-out', { method: 'POST', body: JSON.stringify(data) }),
  getTodayAttendance: (dateStr) => request(`/attendance/today${dateStr ? `?date_str=${dateStr}` : ''}`),
  getAttendanceCalendar: (month, empId) => request(`/attendance/calendar?month=${month}${empId ? `&employee_id=${empId}` : ''}`),
  requestCorrection: (data) => request('/attendance/correction', { method: 'POST', body: JSON.stringify(data) }),
  listCorrections: () => request('/attendance/corrections'),
  reviewCorrection: (id, data) => request(`/attendance/corrections/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),

  // Leave
  applyLeave: (data) => request('/leave/apply', { method: 'POST', body: JSON.stringify(data) }),
  getLeaveBalances: (empId) => request(`/leave/balances${empId ? `?employee_id=${empId}` : ''}`),
  getMyLeaveRequests: () => request('/leave/my-requests'),
  cancelLeave: (id) => request(`/leave/${id}/cancel`, { method: 'POST' }),
  getLeaveInbox: () => request('/leave/inbox'),
  reviewLeave: (id, data) => request(`/leave/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),

  // Payroll
  runPayroll: (month) => request('/payroll/run', { method: 'POST', body: JSON.stringify({ month }) }),
  listPayrollRuns: () => request('/payroll/runs'),
  getPayrollRunDetails: (id) => request(`/payroll/runs/${id}`),
  finalizePayroll: (id) => request(`/payroll/runs/${id}/finalize`, { method: 'POST' }),
  listPayslips: (month) => request(`/payroll/payslips${month ? `?month=${month}` : ''}`),
  downloadPayslipPdf: (id) => request(`/payroll/payslips/${id}/pdf`),

  // Analytics
  getAdminAnalytics: (deptId) => request(`/analytics/admin${deptId ? `?department_id=${deptId}` : ''}`),
  getHRAnalytics: (deptId) => request(`/analytics/hr${deptId ? `?department_id=${deptId}` : ''}`),
  getEmployeeAnalytics: () => request('/analytics/employee'),

  // AI Assistant
  aiChat: (message) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  aiDashboardSummary: (kpi_data) => request('/ai/dashboard-summary', { method: 'POST', body: JSON.stringify({ kpi_data }) }),
  aiSmartLeave: (sentence) => request('/ai/smart-leave', { method: 'POST', body: JSON.stringify({ sentence }) }),

  // Comms & Notifications
  postAnnouncement: (data) => request('/comms/announcements', { method: 'POST', body: JSON.stringify(data) }),
  listAnnouncements: () => request('/comms/announcements'),
  listNotifications: () => request('/comms/notifications'),
  markNotificationRead: (id) => request(`/comms/notifications/${id}/read`, { method: 'PATCH' }),

  // Audit
  listAuditLogs: (params = '') => request(`/audit/logs?${params}`),
};
