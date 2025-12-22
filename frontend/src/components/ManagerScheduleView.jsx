import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, RefreshCw } from 'lucide-react';
import { format, addDays, startOfWeek, isToday, addWeeks, subWeeks } from 'date-fns';

const ManagerScheduleView = ({ user }) => {
  const [schedule, setSchedule] = useState({});
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState({});
  const [unavailability, setUnavailability] = useState({});
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  useEffect(() => {
    loadData();
    // Refresh schedule data every 30 seconds to catch updates
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Get employees
      const empRes = await fetch('http://localhost:8000/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData);
      }

      // Get roles
      const rolesRes = await fetch('http://localhost:8000/roles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData);
      }

      // Get schedules
      const schedRes = await fetch(
        `http://localhost:8000/schedules?skip=0&limit=500`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (schedRes.ok) {
        const schedData = await schedRes.json();
        // Transform schedules into calendar format
        const scheduleByDateEmployee = {};
        schedData.forEach(sched => {
          const dateStr = format(new Date(sched.date), 'yyyy-MM-dd');
          if (!scheduleByDateEmployee[dateStr]) {
            scheduleByDateEmployee[dateStr] = {};
          }
          if (!scheduleByDateEmployee[dateStr][sched.employee_id]) {
            scheduleByDateEmployee[dateStr][sched.employee_id] = [];
          }
          scheduleByDateEmployee[dateStr][sched.employee_id].push({
            id: sched.id,
            role_id: sched.role_id,
            start_time: sched.start_time,
            end_time: sched.end_time,
            role_name: roles.find(r => r.id === sched.role_id)?.name || 'Unknown'
          });
        });
        setSchedule(scheduleByDateEmployee);
      }

      // Get leave requests
      const leavesRes = await fetch('http://localhost:8000/leave-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (leavesRes.ok) {
        const leavesData = await leavesRes.json();
        const leavesByKey = {};
        leavesData.forEach(leave => {
          if (leave.status === 'approved') {
            // Expand date range: create entry for each day in the leave period
            const startDate = new Date(leave.start_date + 'T00:00:00');
            const endDate = new Date(leave.end_date + 'T00:00:00');

            // Iterate through each day in the range (inclusive)
            for (let currentDate = new Date(startDate);
                 currentDate <= endDate;
                 currentDate.setDate(currentDate.getDate() + 1)) {
              const dateStr = format(currentDate, 'yyyy-MM-dd');
              leavesByKey[`${leave.employee_id}-${dateStr}`] = leave;
            }
          }
        });
        setLeaveRequests(leavesByKey);
      }

      // Get unavailability
      const unavailRes = await fetch('http://localhost:8000/unavailability', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (unavailRes.ok) {
        const unavailData = await unavailRes.json();
        const unavailByKey = {};
        unavailData.forEach(unavail => {
          unavailByKey[`${unavail.employee_id}-${unavail.date}`] = unavail;
        });
        setUnavailability(unavailByKey);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLeave = async (employeeId, date) => {
    try {
      setToggling(`${employeeId}-${date}-leave`);
      const token = localStorage.getItem('token');
      const dateStr = format(date, 'yyyy-MM-dd');
      const key = `${employeeId}-${dateStr}`;
      const isCurrentlyOnLeave = !!leaveRequests[key];

      if (isCurrentlyOnLeave) {
        // Remove leave - delete the leave request
        const leaveId = leaveRequests[key].id;
        await fetch(`http://localhost:8000/leave-requests/${leaveId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const newLeaves = { ...leaveRequests };
        delete newLeaves[key];
        setLeaveRequests(newLeaves);
      } else {
        // Add leave
        const res = await fetch('http://localhost:8000/leave-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            employee_id: employeeId,
            start_date: dateStr,
            end_date: dateStr,
            leave_type: 'vacation',
            reason: 'Marked as leave'
          })
        });

        if (res.ok) {
          const newLeave = await res.json();
          setLeaveRequests({
            ...leaveRequests,
            [key]: newLeave
          });
        }
      }
    } catch (error) {
      console.error('Error toggling leave:', error);
      alert('Failed to toggle leave status');
    } finally {
      setToggling(null);
    }
  };

  const toggleUnavailable = async (employeeId, date) => {
    try {
      setToggling(`${employeeId}-${date}-unavail`);
      const token = localStorage.getItem('token');
      const dateStr = format(date, 'yyyy-MM-dd');
      const key = `${employeeId}-${dateStr}`;
      const isCurrentlyUnavail = !!unavailability[key];

      if (isCurrentlyUnavail) {
        // Remove unavailability
        const unavailId = unavailability[key].id;
        await fetch(`http://localhost:8000/unavailability/${unavailId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const newUnavail = { ...unavailability };
        delete newUnavail[key];
        setUnavailability(newUnavail);
      } else {
        // Add unavailability
        const res = await fetch('http://localhost:8000/unavailability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            employee_id: employeeId,
            date: dateStr,
            reason: 'Marked as unavailable'
          })
        });

        if (res.ok) {
          const newUnavail = await res.json();
          setUnavailability({
            ...unavailability,
            [key]: newUnavail
          });
        }
      }
    } catch (error) {
      console.error('Error toggling unavailability:', error);
      alert('Failed to toggle unavailability status');
    } finally {
      setToggling(null);
    }
  };

  const isOnLeave = (employeeId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return !!leaveRequests[`${employeeId}-${dateStr}`];
  };

  const isUnavailable = (employeeId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return !!unavailability[`${employeeId}-${dateStr}`];
  };

  const getShiftsForEmployee = (employeeId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedule[dateStr]?.[employeeId] || [];
  };

  const getRoleEmployees = (roleId) => {
    return employees.filter(e => e.role_id === roleId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 min-w-64">
              Week of {format(currentWeekStart, 'MMM dd, yyyy')}
            </h2>
            <button 
              onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            title="Refresh schedule data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Calendar Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Header with Days */}
            <thead>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold text-gray-900 bg-gray-50" style={{ minWidth: '150px' }}>
                  Employee
                </td>
                {weekDates.map((date, idx) => (
                  <td 
                    key={idx}
                    className={`border border-gray-300 p-2 text-center font-semibold ${
                      isToday(date) ? 'bg-blue-100 border-blue-500' : 'bg-gray-50'
                    }`}
                    style={{ minWidth: '140px' }}
                  >
                    <div className="text-sm text-gray-900">{daysOfWeek[idx]}</div>
                    <div className="text-xs text-gray-600">{format(date, 'MMM dd')}</div>
                  </td>
                ))}
              </tr>
            </thead>

            {/* Employee Rows by Role */}
            <tbody>
              {roles.map((role, roleIdx) => {
                const roleEmployees = getRoleEmployees(role.id);
                if (roleEmployees.length === 0) return null;

                return (
                  <React.Fragment key={role.id}>
                    {/* Role Header Row */}
                    <tr>
                      <td 
                        colSpan={8}
                        className="border border-gray-300 p-3 font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600"
                      >
                        {role.name} ({roleEmployees.length})
                      </td>
                    </tr>

                    {/* Employee Rows */}
                    {roleEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-blue-50">
                        {/* Employee Name */}
                        <td 
                          className="border border-gray-300 p-3 font-semibold text-gray-900 bg-gray-50 sticky left-0"
                          style={{ minWidth: '150px' }}
                        >
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            className="text-blue-600 hover:text-blue-800 text-left hover:underline"
                          >
                            {emp.first_name} {emp.last_name}
                          </button>
                        </td>

                        {/* Calendar Cells */}
                        {weekDates.map((date, idx) => {
                          const shifts = getShiftsForEmployee(emp.id, date);
                          const onLeave = isOnLeave(emp.id, date);
                          const unavail = isUnavailable(emp.id, date);
                          const dateStr = format(date, 'yyyy-MM-dd');

                          return (
                            <td
                              key={dateStr}
                              className={`border border-gray-300 p-2 min-h-20 align-top text-xs ${
                                onLeave
                                  ? 'bg-red-100'
                                  : unavail
                                  ? 'bg-orange-100'
                                  : isToday(date)
                                  ? 'bg-blue-50'
                                  : 'bg-white'
                              }`}
                              style={{ minWidth: '140px' }}
                            >
                              {unavail && (
                                <div className="text-center">
                                  <div className="font-bold text-orange-700">UNAVAIL</div>
                                </div>
                              )}
                              {onLeave && (
                                <div className="mb-2">
                                  <div className="text-center">
                                    <div className="font-bold text-red-700">LEAVE</div>
                                  </div>
                                </div>
                              )}
                              {shifts.length > 0 && (
                                <div className="space-y-1">
                                  {shifts.map((shift, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className="bg-green-100 border border-green-300 rounded p-1 cursor-pointer hover:shadow-md transition-shadow"
                                      onClick={() => setSelectedEmployee(emp)}
                                    >
                                      <div className="font-semibold text-green-700 text-xs">
                                        {shift.role_name}
                                      </div>
                                      <div className="text-green-600 text-xs font-mono">
                                        {shift.start_time} - {shift.end_time}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {!onLeave && !unavail && shifts.length === 0 && (
                                <div className="text-center text-gray-400 text-xs">—</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 border border-green-300 rounded"></div>
            <span>Shift assigned (Role - From To)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-100 border border-red-300 rounded"></div>
            <span>Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-100 border border-orange-300 rounded"></div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-50 border border-gray-300 rounded"></div>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedEmployee.first_name} {selectedEmployee.last_name}
                </h2>
                <p className="text-gray-600">
                  {roles.find(r => r.id === selectedEmployee.role_id)?.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Weekly Calendar with L/U Buttons */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Weekly Schedule</h3>
              <div className="grid grid-cols-7 gap-2">
                {weekDates.map((date, idx) => {
                  const shifts = getShiftsForEmployee(selectedEmployee.id, date);
                  const onLeave = isOnLeave(selectedEmployee.id, date);
                  const unavail = isUnavailable(selectedEmployee.id, date);

                  return (
                    <div key={idx} className="border rounded-lg p-3 text-center bg-gray-50">
                      <div className="font-semibold text-sm text-gray-900">
                        {daysOfWeek[idx].slice(0, 3)}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">{format(date, 'MMM dd')}</div>

                      {shifts.length > 0 && !onLeave && !unavail && (
                        <div className="mb-2 text-xs bg-green-100 p-1 rounded border border-green-300 space-y-0.5">
                          {shifts.map((shift, sIdx) => (
                            <div key={sIdx}>
                              <div className="font-semibold text-green-700">{shift.role_name}</div>
                              <div className="text-green-600 text-xs">{shift.start_time}-{shift.end_time}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => toggleLeave(selectedEmployee.id, date)}
                          disabled={toggling === `${selectedEmployee.id}-${format(date, 'yyyy-MM-dd')}-leave`}
                          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                            onLeave
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {toggling === `${selectedEmployee.id}-${format(date, 'yyyy-MM-dd')}-leave` ? '...' : 'L'}
                        </button>
                        <button
                          onClick={() => toggleUnavailable(selectedEmployee.id, date)}
                          disabled={toggling === `${selectedEmployee.id}-${format(date, 'yyyy-MM-dd')}-unavail`}
                          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                            unavail
                              ? 'bg-orange-500 text-white hover:bg-orange-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {toggling === `${selectedEmployee.id}-${format(date, 'yyyy-MM-dd')}-unavail` ? '...' : 'U'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-4 text-sm text-gray-600">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="inline-block w-3 h-3 bg-green-100 border border-green-300 mr-2 rounded"></span>Shift</div>
                  <div><span className="inline-block w-3 h-3 bg-red-100 border border-red-300 mr-2 rounded"></span>Leave (L)</div>
                  <div><span className="inline-block w-3 h-3 bg-orange-100 border border-orange-300 mr-2 rounded"></span>Unavail (U)</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedEmployee(null)}
              className="w-full mt-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerScheduleView;
