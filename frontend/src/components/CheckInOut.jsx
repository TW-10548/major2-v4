import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { checkIn, checkOut, getAttendance } from '../services/api';
import { Clock, LogIn, LogOut, AlertCircle, CheckCircle } from 'lucide-react';
import Card from './common/Card';
import Button from './common/Button';

export default function CheckInOut() {
  const [todayStatus, setTodayStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadTodayStatus();
  }, []);

  // Update running time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (dateTime) => {
    if (!dateTime) return null;
    try {
      if (typeof dateTime === 'string') {
        // Already formatted as string time (HH:MM)
        if (dateTime.match(/^\d{2}:\d{2}/)) return dateTime;
        // Parse ISO datetime string
        const date = new Date(dateTime);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      return dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return null;
    }
  };

  const loadTodayStatus = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      console.log(`[CheckInOut] Loading status for ${today}`);
      const response = await getAttendance(today, today);
      
      console.log('[CheckInOut] API Response:', response);
      
      if (response.data && response.data.length > 0) {
        let status = response.data[0];
        console.log('[CheckInOut] Status found:', status);
        
        // Normalize the response to always have in_time and out_time
        // The Attendance API returns in_time/out_time as HH:MM strings
        if (!status.in_time && status.check_in_time) {
          status.in_time = formatTime(status.check_in_time);
        }
        if (!status.out_time && status.check_out_time) {
          status.out_time = formatTime(status.check_out_time);
        }
        
        // Normalize status field
        if (!status.status && status.check_in_status) {
          status.status = status.check_in_status;
        }
        
        console.log('Normalized status:', status);
        setTodayStatus(status);
        setError('');
      } else {
        console.log('[CheckInOut] No status found for today');
        setTodayStatus(null);
        setError('');
      }
    } catch (error) {
      console.error('Failed to load attendance status:', error);
      setError('Failed to load check-in status');
      setTodayStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTodayStatus();
    setIsRefreshing(false);
  };

  const handleCheckIn = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await checkIn('Office');
      
      // Immediately update UI with check-in response
      if (response.data || response) {
        const checkInData = response.data || response;
        
        // Create a status object that matches Attendance response format
        const newStatus = {
          id: checkInData.id || 0,
          employee_id: checkInData.employee_id,
          schedule_id: checkInData.schedule_id,
          date: checkInData.date,
          in_time: formatTime(checkInData.check_in_time),
          out_time: null,
          status: checkInData.check_in_status,
          worked_hours: 0,
          overtime_hours: 0,
          break_minutes: 0,
          out_status: null,
          notes: null
        };
        
        console.log('Check-in successful, setting status:', newStatus);
        setTodayStatus(newStatus);
        setSuccess('✅ Checked in successfully!');
      }
      
      // Reload after a moment to ensure database is synced
      setTimeout(() => {
        console.log('Reloading status from database...');
        loadTodayStatus();
      }, 800);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to check in';
      setError(errorMsg);
      console.error('Check-in error details:', {
        status: err.response?.status,
        message: errorMsg,
        fullError: err
      });
      
      // Reload status to show correct state when there's an error
      // This ensures we display the actual current status instead of stale data
      await loadTodayStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await checkOut(notes);
      
      // Immediately update UI with check-out response
      if (response.data || response) {
        const checkOutData = response.data || response;
        
        // Update the status object with check-out time
        const updatedStatus = {
          ...todayStatus,
          out_time: formatTime(checkOutData.check_out_time),
          worked_hours: todayStatus.worked_hours || 0,
          overtime_hours: todayStatus.overtime_hours || 0
        };
        
        console.log('Check-out successful, setting status:', updatedStatus);
        setTodayStatus(updatedStatus);
        setSuccess('✅ Checked out successfully!');
      }
      
      setNotes('');
      
      // Reload after a moment to sync with database
      setTimeout(() => {
        console.log('Reloading status from database...');
        loadTodayStatus();
      }, 800);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to check out';
      setError(errorMsg);
      console.error('Check-out error details:', {
        status: err.response?.status,
        message: errorMsg,
        fullError: err
      });
      
      // Reload status to show correct state when there's an error
      await loadTodayStatus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Check In / Out" subtitle="Track your work hours">
      {/* Running Time Display */}
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Current Time</p>
            <p className="text-4xl font-bold text-blue-900 font-mono">
              {format(currentTime, 'HH:mm:ss')}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              {format(currentTime, 'EEEE, MMMM dd, yyyy')}
            </p>
          </div>
          <Clock className="w-12 h-12 text-blue-600" />
        </div>
      </div>

      {loading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-blue-700">Loading check-in status...</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-green-700">{success}</span>
        </div>
      )}

      {/* DEBUG INFO - Remove in production */}
      <div className="mb-4 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-32">
        <details>
          <summary className="cursor-pointer font-bold">Debug Info</summary>
          <div className="mt-2">
            <p>todayStatus: {todayStatus ? 'EXISTS' : 'NULL'}</p>
            {todayStatus && (
              <>
                <p>in_time: {todayStatus.in_time || 'NULL'}</p>
                <p>out_time: {todayStatus.out_time || 'NULL'}</p>
                <p>status: {todayStatus.status}</p>
              </>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
            </button>
          </div>
        </details>
      </div>

      <div className="space-y-4">
        {todayStatus ? (
          <>
            {/* Check-In Status */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Checked In</p>
                  <p className="text-xl font-semibold text-blue-900">
                    {todayStatus.in_time 
                      ? todayStatus.in_time
                      : 'Not yet'}
                  </p>
                  {todayStatus.status && (
                    <p className="text-xs text-blue-600 mt-1">
                      Status: <span className="font-semibold">{todayStatus.status}</span>
                    </p>
                  )}
                </div>
                <LogIn className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            {/* Check-Out Status */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Checked Out</p>
                  <p className="text-xl font-semibold text-purple-900">
                    {todayStatus.out_time 
                      ? todayStatus.out_time
                      : 'Not yet'}
                  </p>
                </div>
                <LogOut className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            {/* Work Duration */}
            {todayStatus.in_time && todayStatus.out_time && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Total Hours Worked</p>
                <p className="text-lg font-semibold text-green-900">
                  {todayStatus.worked_hours ? todayStatus.worked_hours.toFixed(2) : '0'} hours
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {!todayStatus.out_time && todayStatus.in_time && (
              <div className="space-y-3 pt-4 border-t">
                <Button 
                  variant="success" 
                  fullWidth 
                  disabled={loading}
                  onClick={handleCheckOut}
                >
                  <LogOut className="w-4 h-4 mr-2 inline" />
                  Check Out
                </Button>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes (optional)"
                  className="w-full p-2 border rounded text-sm"
                  rows={2}
                />
              </div>
            )}
            
            {!todayStatus.in_time && (
              <div className="pt-4 border-t">
                <Button 
                  variant="primary" 
                  fullWidth 
                  disabled={loading}
                  onClick={handleCheckIn}
                >
                  <LogIn className="w-4 h-4 mr-2 inline" />
                  Check In Now
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium">Not checked in yet</p>
            <p className="text-sm text-gray-500 mt-1">Click the button below to check in</p>
            <Button 
              variant="primary" 
              fullWidth 
              disabled={loading}
              onClick={handleCheckIn}
              className="mt-4"
            >
              <LogIn className="w-4 h-4 mr-2 inline" />
              Check In Now
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function calculateHours(checkInTime, checkOutTime) {
  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkOutTime);
  const diffMs = checkOut - checkIn;
  const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
  return diffHours;
}
