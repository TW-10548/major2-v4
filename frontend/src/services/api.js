import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = async (username, password) => {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);

  const response = await api.post('/token', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
};

// Admin - User Management
export const createUser = (userData) => api.post('/admin/users', userData);
export const listUsers = () => api.get('/admin/users');
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);
export const checkUsernameAvailable = (username) => 
  listUsers().then(res => {
    const exists = res.data.some(u => u.username.toLowerCase() === username.toLowerCase());
    return !exists;
  }).catch(() => true); // If check fails, allow it

// Managers
export const createManager = (managerData, forceReassign = false) => 
  api.post('/managers', managerData, {
    params: { force_reassign: forceReassign }
  });
export const listManagers = () => api.get('/managers');
export const updateManager = (id, managerData) => api.put(`/managers/${id}`, managerData);
export const reassignManager = (id, managerData) => api.put(`/managers/${id}/reassign`, managerData);
export const deleteManager = (id) => api.delete(`/managers/${id}`);

// Departments
export const createDepartment = (deptData) => api.post('/departments', deptData);
export const listDepartments = () => api.get('/departments');
export const updateDepartment = (id, deptData) => api.put(`/departments/${id}`, deptData);
export const searchDepartments = async (query) => {
  try {
    return await api.get(`/departments/search/${query}`);
  } catch (error) {
    // Handle 404 as empty results instead of error
    if (error.response?.status === 404) {
      return { data: [] };
    }
    throw error;
  }
};
export const deleteDepartment = (id) => api.delete(`/departments/${id}`);

// Employees
export const createEmployee = (empData) => api.post('/employees', empData);
export const listEmployees = (showInactive = false) => api.get('/employees', { params: { show_inactive: showInactive } });
export const updateEmployee = (id, empData) => api.put(`/employees/${id}`, empData);
export const deleteEmployee = (id, hardDelete = false) =>
  api.delete(`/employees/${id}`, {
    params: hardDelete ? { hard_delete: true } : {}
  });

// Roles
export const createRole = (roleData) => api.post('/roles', roleData);
export const listRoles = () => api.get('/roles');
export const getRoleById = (id) => api.get(`/roles/${id}`);
export const updateRole = (id, roleData) => api.put(`/roles/${id}`, roleData);
export const deleteRole = (id) => api.delete(`/roles/${id}`);

// Check-In/Out
export const checkIn = (location) => api.post('/employee/check-in', { location });
export const checkOut = (notes) => api.post('/employee/check-out', { notes });

// Leave Requests
export const createLeaveRequest = (leaveData) => api.post('/leave-requests', leaveData);
export const listLeaveRequests = () => api.get('/leave-requests');
export const approveLeave = (leaveId, reviewNotes) => {
  const body = {};
  if (reviewNotes) body.review_notes = reviewNotes;
  return api.post(`/manager/approve-leave/${leaveId}`, body);
};
export const rejectLeave = (leaveId, reviewNotes) => {
  const body = {};
  if (reviewNotes) body.review_notes = reviewNotes;
  return api.post(`/manager/reject-leave/${leaveId}`, body);
};

// Leave Statistics
export const getLeaveStatistics = () => api.get('/leave-statistics');
export const getEmployeeLeaveStatistics = (employeeId) => api.get(`/leave-statistics/employee/${employeeId}`);

// Comp-Off Management
export const createCompOffRequest = (compOffData) => api.post('/comp-off-requests', compOffData);
export const listCompOffRequests = () => api.get('/comp-off-requests');
export const getCompOffTracking = () => api.get('/comp-off-tracking');
export const getMonthlyCompOffBreakdown = () => api.get('/comp-off/monthly-breakdown');
export const validateCompOffAvailable = (month) => api.get(`/comp-off/validate-available/${month}`);
export const approveCompOff = (compOffId, reviewNotes) => {
  const body = { review_notes: reviewNotes || 'Approved' };
  return api.post(`/manager/approve-comp-off/${compOffId}`, body);
};
export const rejectCompOff = (compOffId, reviewNotes) => {
  const body = { review_notes: reviewNotes || '' };
  return api.post(`/manager/reject-comp-off/${compOffId}`, body);
};
export const getCompOffStatistics = () => api.get('/comp-off-statistics');
export const exportCompOffReport = () => api.get('/comp-off/export/employee', { responseType: 'blob' });
export const exportLeaveCompOffReport = (employeeId) => api.get(`/manager/export-leave-compoff/${employeeId}`, { responseType: 'blob' });

// Unavailability
export const createUnavailability = (unavailData) => api.post('/unavailability', unavailData);
export const listUnavailability = (employeeId = null, startDate = null, endDate = null) => {
  const params = new URLSearchParams();
  if (employeeId) params.append('employee_id', employeeId);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return api.get(`/unavailability?${params.toString()}`);
};
export const deleteUnavailability = (id) => api.delete(`/unavailability/${id}`);

// Shifts
export const createShift = (shiftData) => api.post('/shifts', shiftData);
export const listShifts = (roleId = null, includeInactive = false) => {
  const params = {};
  if (roleId) params.role_id = roleId;
  if (includeInactive) params.include_inactive = true;
  return api.get('/shifts', { params });
};
export const updateShift = (id, shiftData) => api.put(`/shifts/${id}`, shiftData);
export const deleteShift = (id, hardDelete = false) =>
  api.delete(`/shifts/${id}`, {
    params: hardDelete ? { hard_delete: true } : {}
  });

// Messages
export const sendMessage = (messageData) => api.post('/messages', messageData);
export const getMessages = () => api.get('/messages');
export const deleteMessage = (id) => api.delete(`/messages/${id}`);
export const markMessageAsRead = (id) => api.put(`/messages/${id}/read`);

// Schedules
export const getSchedules = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return api.get(`/schedules?${params.toString()}`);
};
export const createSchedule = (scheduleData) => api.post('/schedules', scheduleData);
export const updateSchedule = (id, scheduleData) => api.put(`/schedules/${id}`, scheduleData);
export const deleteSchedule = (id) => api.delete(`/schedules/${id}`);
export const generateSchedule = (startDate, endDate, regenerate = false) => {
  const params = new URLSearchParams();
  params.append('start_date', startDate);
  params.append('end_date', endDate);
  params.append('regenerate', regenerate);
  return api.post(`/schedules/generate?${params.toString()}`);
};

// Attendance
export const recordAttendance = (attendanceData) => 
  api.post('/attendance/record', attendanceData);
export const recordCheckout = (attendanceId, checkoutData) =>
  api.put(`/attendance/${attendanceId}/checkout`, checkoutData);
export const getAttendance = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return api.get(`/attendance?${params.toString()}`);
};
export const getAttendanceSummary = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return api.get(`/attendance/summary?${params.toString()}`);
};
export const getWeeklyAttendance = (employeeId, startDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  return api.get(`/attendance/weekly/${employeeId}?${params.toString()}`);
};

// Attendance Export Functions
export const exportMonthlyAttendance = (departmentId, year, month) => {
  return api.get(`/attendance/export/monthly?department_id=${departmentId}&year=${year}&month=${month}`, {
    responseType: 'blob'
  });
};

export const exportMonthlyComprehensiveAttendance = (departmentId, year, month) => {
  return api.get(`/attendance/export/monthly-comprehensive?department_id=${departmentId}&year=${year}&month=${month}`, {
    responseType: 'blob'
  });
};

export const exportWeeklyAttendance = (departmentId, startDate, endDate) => {
  return api.get(`/attendance/export/weekly?department_id=${departmentId}&start_date=${startDate}&end_date=${endDate}`, {
    responseType: 'blob'
  });
};

// Calendar & Holidays
export const getHolidays = (year, month) => {
  return api.get(`/calendar/holidays?year=${year}&month=${month}`);
};

export const getWeekInfo = (year, month, weekNumber) => {
  return api.get(`/calendar/week-info?year=${year}&month=${month}&week_number=${weekNumber}`);
};

export const getWeekValidation = (employeeId, year, month, week) => {
  return api.get(`/calendar/week-validation/${employeeId}?year=${year}&month=${month}&week=${week}`);
};

// Schedule Generation
export const generateSchedules = (startDate, endDate) => {
  const params = new URLSearchParams();
  params.append('start_date', startDate);
  params.append('end_date', endDate);
  return api.post(`/schedules/generate?${params.toString()}`);
};

// Notifications
export const getNotifications = (unreadOnly = false) => {
  const params = new URLSearchParams();
  if (unreadOnly) params.append('unread_only', 'true');
  return api.get(`/notifications?${params.toString()}`);
};
export const markNotificationRead = (notificationId) =>
  api.post(`/notifications/${notificationId}/mark-read`);
export const markAllNotificationsRead = () => api.post('/notifications/mark-all-read');
export const deleteNotification = (notificationId) =>
  api.delete(`/notifications/${notificationId}`);

export default api;
