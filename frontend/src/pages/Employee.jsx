import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import CheckInOut from '../components/CheckInOut';
import OvertimeRequest from '../components/OvertimeRequest';
import {
  listLeaveRequests,
  listEmployees,
  getSchedules,
  getAttendance,
  checkIn,
  checkOut,
  getMessages,
  deleteMessage,
  markMessageAsRead,
  createLeaveRequest
} from '../services/api';
import {
  Plus, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Calendar,
  CalendarDays, MessageSquare, UserCheck, Mail, MailOpen, AlertCircle, LogOut, Trash2, X, Download
} from 'lucide-react';

// =============== EMPLOYEE PAGES ===============

const EmployeeDashboardHome = ({ user }) => {
  const navigate = useNavigate();
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [schedulesRes] = await Promise.all([
        getSchedules(today, today)
      ]);
      setTodaySchedule(schedulesRes.data[0] || null);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Employee Dashboard" subtitle={`Welcome back, ${user.full_name}`} />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card title={`Today's Schedule - ${format(new Date(), 'MMM dd, yyyy')}`}>
            {todaySchedule ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Shift Time</p>
                    <p className="text-lg font-semibold text-blue-900">
                      {todaySchedule.start_time} - {todaySchedule.end_time}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarDays className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">No shift scheduled for today</p>
                <p className="text-sm text-gray-400 mt-1">Enjoy your day off!</p>
              </div>
            )}
          </Card>
          <CheckInOut />
          <Card title="Quick Access">
            <div className="space-y-3">
              <Button variant="outline" fullWidth className="justify-start" onClick={() => navigate('/schedule')}>
                <CalendarDays className="w-5 h-5 mr-3" />
                View My Schedule
              </Button>
              <Button variant="outline" fullWidth className="justify-start" onClick={() => navigate('/requests')}>
                <Clock className="w-5 h-5 mr-3" />
                Request Leave
              </Button>
              <Button variant="outline" fullWidth className="justify-start" onClick={() => navigate('/messages')}>
                <MessageSquare className="w-5 h-5 mr-3" />
                Messages
              </Button>
              <Button variant="outline" fullWidth className="justify-start" onClick={() => navigate('/attendance')}>
                <UserCheck className="w-5 h-5 mr-3" />
                View Attendance History
              </Button>
            </div>
          </Card>
        </div>
        <Card title="Important Information">
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Remember to check in when you arrive for your shift</p>
            <p>• Check your schedule regularly for any updates</p>
            <p>• Submit leave requests in advance</p>
            <p>• Contact your manager if you have any questions</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

const EmployeeCheckIn = ({ user }) => {
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [location, setLocation] = useState('Office');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await getSchedules(today, today);
      setTodaySchedule(response.data[0] || null);
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setMessage({ type: '', text: '' });
    try {
      await checkIn(location);
      setCheckedIn(true);
      setCheckInTime(new Date());
      setMessage({ type: 'success', text: 'Successfully checked in!' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to check in. Please try again.'
      });
    }
  };

  const handleCheckOut = async () => {
    setMessage({ type: '', text: '' });
    try {
      await checkOut(notes);
      setCheckedIn(false);
      setMessage({ type: 'success', text: 'Successfully checked out!' });
      setTimeout(() => {
        setCheckInTime(null);
        setNotes('');
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to check out. Please try again.'
      });
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  if (!todaySchedule) {
    return (
      <div>
        <Header title="Check In/Out" subtitle="Record your attendance" />
        <div className="p-6">
          <Card>
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No shift scheduled for today</p>
              <p className="text-sm text-gray-400 mt-2">You don't need to check in today</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Check In/Out" subtitle="Record your attendance" />
      <div className="p-6">
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-start ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            )}
            <span className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {message.text}
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title={`Today's Shift - ${format(new Date(), 'MMMM dd, yyyy')}`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Scheduled Time</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {todaySchedule.start_time} - {todaySchedule.end_time}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              {checkedIn && checkInTime && (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Checked In At</p>
                    <p className="text-lg font-semibold text-green-900">
                      {format(checkInTime, 'HH:mm:ss')}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              )}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Current Time</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {format(new Date(), 'HH:mm:ss')}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </Card>
          <Card title={checkedIn ? 'Check Out' : 'Check In'}>
            {!checkedIn ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="Office">Office</option>
                    <option value="Remote">Remote</option>
                    <option value="Client Site">Client Site</option>
                  </select>
                </div>
                <Button variant="success" fullWidth className="h-14 text-lg" onClick={handleCheckIn}>
                  <UserCheck className="w-6 h-6 mr-2 inline" />
                  Check In Now
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Click the button above when you arrive at your shift location
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-2" />
                  <p className="text-green-800 font-semibold">You are checked in</p>
                  <p className="text-sm text-green-600 mt-1">
                    Since {checkInTime && format(checkInTime, 'HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows="3"
                    placeholder="Add any notes about your shift..."
                  />
                </div>
                <Button variant="danger" fullWidth className="h-14 text-lg" onClick={handleCheckOut}>
                  <LogOut className="w-6 h-6 mr-2 inline" />
                  Check Out Now
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Click the button above when you're leaving
                </p>
              </div>
            )}
          </Card>
        </div>
        <Card title="Tips" className="mt-6">
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Check in when you arrive at your scheduled shift</li>
            <li>• Make sure to check out when you leave</li>
            <li>• Late check-ins may be flagged for review</li>
            <li>• Contact your manager if you have any issues</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

const EmployeeSchedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, [currentMonth]);

  const loadSchedules = async () => {
    try {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const response = await getSchedules(start, end);
      setSchedules(response.data);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div>
      <Header title="My Schedule" subtitle="View your upcoming shifts" />
      <div className="p-6">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {schedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No shifts scheduled for this month</p>
              <p className="text-sm text-gray-400 mt-2">Check back later for updates</p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {format(new Date(schedule.date), 'EEEE, MMMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {schedule.start_time} - {schedule.end_time}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        Scheduled
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Schedule Information" className="mt-6">
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Your schedule is updated regularly by your manager</p>
            <p>• Make sure to check in on time for your shifts</p>
            <p>• If you can't make a shift, request leave in advance</p>
            <p>• Contact your manager if you have questions about your schedule</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

const EmployeeLeaves = ({ user }) => {
  const [leaves, setLeaves] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employeeId, setEmployeeId] = useState(null);
  const [formData, setFormData] = useState({
    leave_type: 'vacation',
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      // Get employee data to find employee_id
      const empRes = await listEmployees();
      const employees = empRes.data;
      
      // Find current employee
      const currentEmp = employees.find(e => e.user_id === user.id);
      if (currentEmp) {
        setEmployeeId(currentEmp.id);
      }
      
      const response = await listLeaveRequests();
      setLeaves(response.data);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!employeeId) {
      setError('Unable to find your employee record. Please refresh the page.');
      return;
    }
    
    try {
      await createLeaveRequest({
        ...formData,
        employee_id: employeeId
      });
      setShowModal(false);
      setFormData({ leave_type: 'vacation', start_date: '', end_date: '', reason: '' });
      loadLeaves();
    } catch (err) {
      let errorMsg = 'Failed to create leave request';
      
      // Handle validation errors from backend
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        
        // Check if it's an array of validation errors
        if (Array.isArray(detail)) {
          errorMsg = detail.map(e => {
            if (typeof e === 'object' && e.msg) {
              const field = e.loc?.[1] || 'field';
              return `${field}: ${e.msg}`;
            }
            return String(e);
          }).join('; ');
        } else if (typeof detail === 'object' && detail.msg) {
          errorMsg = detail.msg;
        } else if (typeof detail === 'string') {
          errorMsg = detail;
        }
      }
      
      setError(errorMsg);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${config.bg} ${config.text} flex items-center`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) return <div className="p-6">Loading...</div>;

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;

  return (
    <div>
      <Header title="Leave Requests" subtitle="Request and manage your time off" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card padding={false}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </Card>
          <Card padding={false}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Approved</p>
                  <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </Card>
          <Card padding={false}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Requests</p>
                  <p className="text-3xl font-bold text-blue-600">{leaves.length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Card>
        </div>
        <Card
          title="My Leave Requests"
          subtitle={`${leaves.length} total requests`}
          headerAction={
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2 inline" />
              New Request
            </Button>
          }
        >
          {leaves.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No leave requests yet</p>
              <p className="text-sm text-gray-400 mt-2">Create your first request to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaves.map((leave) => (
                <div key={leave.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-semibold text-gray-900 capitalize">
                          {leave.leave_type.replace('_', ' ')}
                        </span>
                        {getStatusBadge(leave.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {format(new Date(leave.start_date), 'MMM dd, yyyy')} -{' '}
                        {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-gray-700">{leave.reason}</p>
                      {leave.review_notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-500">Manager's Note:</p>
                          <p className="text-sm text-gray-700">{leave.review_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Request Leave"
          footer={
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Submit Request
              </Button>
            </div>
          }
        >
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
              <select
                value={formData.leave_type}
                onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              >
                <option value="vacation">Vacation</option>
                <option value="sick">Sick Leave</option>
                <option value="personal">Personal</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                rows="4"
                placeholder="Explain why you need leave..."
                required
              />
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

const EmployeeAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0 });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadAttendance();
  }, [currentMonth]);

  const loadAttendance = async () => {
    try {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const response = await getAttendance(start, end);
      setAttendance(response.data);

      // Calculate real statistics from attendance data
      let present = 0, late = 0, absent = 0;
      response.data.forEach(record => {
        if (record.in_time) {
          if (record.status === 'onTime') present++;
          else late++;
        } else {
          absent++;
        }
      });

      setStats({ present, late, absent });
    } catch (error) {
      console.error('Failed to load attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMonthly = async () => {
    try {
      setDownloading(true);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/attendance/export/employee-monthly?year=${year}&month=${month}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_${format(currentMonth, 'MMMM_yyyy')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div>
      <Header title="My Attendance" subtitle="View your attendance history" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card padding={false}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">On Time</p>
                  <p className="text-3xl font-bold text-green-600">{stats.present}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </Card>
          <Card padding={false}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Late</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.late}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </Card>
          <Card padding={false}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Absent</p>
                  <p className="text-3xl font-bold text-red-600">{stats.absent}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </Card>
        </div>
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              onClick={handleDownloadMonthly} 
              disabled={downloading}
              size="sm"
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Downloading...' : 'Download Report'}</span>
            </Button>
          </div>
          {attendance.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No attendance records for this month</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendance.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {format(new Date(record.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {record.schedule ? `${record.schedule.start_time} - ${record.schedule.end_time}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {record.in_time ? record.in_time : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {record.out_time ? record.out_time : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          record.status === 'onTime' ? 'bg-green-100 text-green-800' :
                          record.status === 'slightlyLate' ? 'bg-yellow-100 text-yellow-800' :
                          record.status === 'late' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {record.status || 'Scheduled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Attendance Tips" className="mt-6">
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Always check in on time to maintain a good attendance record</li>
            <li>• Late arrivals may impact your performance reviews</li>
            <li>• If you'll be late or absent, notify your manager in advance</li>
            <li>• Your attendance history is visible to management</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

const EmployeeMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const response = await getMessages();
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteMessage(id);
        loadMessages();
      } catch (error) {
        alert('Failed to delete message');
      }
    }
  };

  const handleMarkAsRead = async (id, isRead) => {
    try {
      if (!isRead) {
        await markMessageAsRead(id);
      }
      loadMessages();
    } catch (error) {
      alert('Failed to update message status');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div>
      <Header title="Messages" subtitle="Messages from your manager" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card padding={false}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Unread Messages</p>
                  <p className="text-3xl font-bold text-blue-600">{unreadCount}</p>
                </div>
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card padding={false}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Messages</p>
                  <p className="text-3xl font-bold text-gray-900">{messages.length}</p>
                </div>
                <MailOpen className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </Card>
        </div>
        <Card title="All Messages" subtitle={`${messages.length} total messages`}>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No messages yet</p>
              <p className="text-sm text-gray-400 mt-2">Messages from your manager will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    msg.is_read
                      ? 'border-gray-200 bg-white hover:border-gray-300'
                      : 'border-blue-200 bg-blue-50 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {!msg.is_read && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-200 text-yellow-800">
                            Unread
                          </span>
                        )}
                        <h4 className="font-semibold text-gray-900">{msg.subject}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        From: {msg.department_id ? 'Department Manager' : 'Manager'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <span className="text-xs text-gray-500">
                        {format(new Date(msg.created_at), 'MMM dd, HH:mm')}
                      </span>
                      <button
                        onClick={() => handleMarkAsRead(msg.id, msg.is_read)}
                        className={`p-1 rounded ${msg.is_read ? 'text-gray-400 hover:text-blue-600 hover:bg-blue-50' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}`}
                        title={msg.is_read ? 'Mark as unread' : 'Mark as read'}
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                        title="Delete message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-700 mt-3 pl-2 border-l-2 border-gray-300 whitespace-pre-wrap">
                    {msg.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// =============== EMPLOYEE REQUESTS COMPONENT ===============

const EmployeeRequests = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    leave_type: 'vacation',
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await listLeaveRequests();
      setRequests(response.data || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await createLeaveRequest(formData);
      setSuccess('✅ Leave request submitted successfully! Your manager will review it.');
      setFormData({ leave_type: 'vacation', start_date: '', end_date: '', reason: '' });
      setShowModal(false);
      loadRequests();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 inline mr-2 text-green-600" />;
      case 'rejected':
        return <X className="w-5 h-5 inline mr-2 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 inline mr-2 text-yellow-600" />;
      default:
        return null;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <Header 
        title="Requests & Approvals" 
        subtitle="Manage your leave and overtime requests"
      />
      
      <div className="p-6">
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
            <span className="text-green-800">{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Pending Requests */}
        <Card 
          title="Pending Requests" 
          subtitle={pendingRequests.length === 0 ? 'No pending requests' : ''}
          action={
            <Button onClick={() => setShowModal(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          }
        >
          {pendingRequests.length > 0 && (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {getStatusIcon(req.status)}
                        <span className="font-semibold capitalize">{req.leave_type}</span>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(req.status)}`}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {req.start_date} to {req.end_date}
                      </p>
                      {req.reason && (
                        <p className="text-sm text-gray-600 mt-2"><strong>Reason:</strong> {req.reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Approved Requests */}
        {approvedRequests.length > 0 && (
          <Card title="Approved Requests" className="mt-6">
            <div className="space-y-3">
              {approvedRequests.map((req) => (
                <div key={req.id} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold capitalize">{req.leave_type}</div>
                      <p className="text-sm text-gray-700">
                        {req.start_date} to {req.end_date}
                      </p>
                      {req.reason && (
                        <p className="text-sm text-gray-600 mt-2"><strong>Reason:</strong> {req.reason}</p>
                      )}
                      {req.reviewed_by && (
                        <p className="text-xs text-gray-500 mt-2">Approved by manager on {req.reviewed_at}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Rejected Requests */}
        {rejectedRequests.length > 0 && (
          <Card title="Rejected Requests" className="mt-6">
            <div className="space-y-3">
              {rejectedRequests.map((req) => (
                <div key={req.id} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-start">
                    <X className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold capitalize">{req.leave_type}</div>
                      <p className="text-sm text-gray-700">
                        {req.start_date} to {req.end_date}
                      </p>
                      {req.reason && (
                        <p className="text-sm text-gray-600 mt-2"><strong>Reason:</strong> {req.reason}</p>
                      )}
                      {req.reviewed_by && (
                        <p className="text-xs text-gray-500 mt-2">Rejected by manager on {req.reviewed_at}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Modal for new request */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Submit Leave Request"
          footer={
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Submit Request
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
              <select
                value={formData.leave_type}
                onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="vacation">Vacation</option>
                <option value="sick">Sick Leave</option>
                <option value="personal">Personal</option>
                <option value="overtime">Overtime Request</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                rows="3"
                placeholder="Provide a reason for your request..."
              />
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

// =============== MAIN EMPLOYEE DASHBOARD COMPONENT ===============

const EmployeeDashboard = ({ user, onLogout }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={<EmployeeDashboardHome user={user} />} />
            <Route path="/check-in" element={<EmployeeCheckIn user={user} />} />
            <Route path="/schedule" element={<EmployeeSchedule />} />
            <Route path="/leaves" element={<EmployeeLeaves user={user} />} />
            <Route path="/requests" element={<EmployeeRequests user={user} />} />
            <Route path="/overtime-requests" element={<OvertimeRequest />} />
            <Route path="/attendance" element={<EmployeeAttendance />} />
            <Route path="/messages" element={<EmployeeMessages />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
