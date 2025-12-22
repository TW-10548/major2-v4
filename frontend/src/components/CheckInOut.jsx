import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { checkIn, checkOut, getAttendance } from '../services/api';
import { Clock, LogIn, LogOut, AlertCircle, CheckCircle } from 'lucide-react';
import Card from './common/Card';
import Button from './common/Button';

export default function CheckInOut() {
  const [todayStatus, setTodayStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

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

  const loadTodayStatus = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await getAttendance(today, today);
      if (response.data && response.data.length > 0) {
        setTodayStatus(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load attendance status:', error);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await checkIn('Office');
      setTodayStatus(response.data);
      setSuccess('✅ Checked in successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to check in';
      setError(errorMsg);
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
      setTodayStatus(response.data);
      setNotes('');
      setSuccess('✅ Checked out successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to check out';
      setError(errorMsg);
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
