import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const ScheduleCalendarView = ({ schedule, employees, roles, shifts, currentWeek, leaveRequests, unavailability, onEmployeeClick }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getEmployeeByRole = (roleId) => {
    return employees.filter(e => e.roleId === roleId);
  };

  const getShiftForEmployee = (employeeId, date) => {
    return schedule[date]?.[employeeId]?.[0] || null;
  };

  const isOnLeave = (employeeId, date) => {
    return !!leaveRequests[`${employeeId}-${date}`];
  };

  const isUnavailable = (employeeId, date) => {
    return !!unavailability[`${employeeId}-${date}`];
  };

  const getShiftTimeForDay = (shift, date) => {
    const dayIdx = currentWeek.indexOf(date);
    if (dayIdx === -1) return null;
    const dayName = daysOfWeek[dayIdx];
    return shift?.schedule?.[dayName];
  };

  return (
    <div className="space-y-6">
      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Schedule Calendar</h3>
        
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header with dates */}
            <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))' }}>
              {currentWeek.map((date, idx) => (
                <div key={date} className="border-2 border-blue-500 rounded-lg p-3 text-center bg-blue-50">
                  <div className="font-bold text-gray-900">{daysOfWeek[idx]}</div>
                  <div className="text-sm text-gray-600">{date}</div>
                </div>
              ))}
            </div>

            {/* Employee rows */}
            <div className="space-y-4">
              {roles.map(role => {
                const roleEmployees = getEmployeeByRole(role.id);
                if (roleEmployees.length === 0) return null;

                return (
                  <div key={role.id} className="border-2 border-gray-300 rounded-lg overflow-hidden">
                    {/* Role Header */}
                    <div className="bg-blue-600 text-white px-4 py-2 font-semibold">
                      {role.name} ({roleEmployees.length})
                    </div>

                    {/* Employee rows for this role */}
                    {roleEmployees.map(emp => (
                      <div key={emp.id} className="border-t border-gray-200">
                        {/* Employee Name */}
                        <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-900 flex items-center justify-between">
                          <span>{emp.name}</span>
                          <button
                            onClick={() => onEmployeeClick(emp.id)}
                            className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            View Details
                          </button>
                        </div>

                        {/* Calendar cells for this employee */}
                        <div className="grid gap-2 p-3" style={{ gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))' }}>
                          {currentWeek.map(date => {
                            const shift = getShiftForEmployee(emp.id, date);
                            const shiftTime = shift ? getShiftTimeForDay(shift, date) : null;
                            const onLeave = isOnLeave(emp.id, date);
                            const unavail = isUnavailable(emp.id, date);

                            return (
                              <div
                                key={date}
                                className={`border rounded-lg p-2 min-h-24 flex flex-col justify-between text-sm cursor-pointer transition-all hover:shadow-md ${
                                  onLeave
                                    ? 'bg-red-100 border-red-300'
                                    : unavail
                                    ? 'bg-orange-100 border-orange-300'
                                    : shift
                                    ? 'bg-green-100 border-green-300'
                                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                                }`}
                                onClick={() => setSelectedEmployee({ ...emp, date, shift })}
                              >
                                {unavail && (
                                  <div className="text-center">
                                    <div className="font-bold text-orange-700">UNAVAILABLE</div>
                                    <div className="text-xs text-orange-600">Not Available</div>
                                  </div>
                                )}
                                {onLeave && (
                                  <div className="mb-2">
                                    <div className="text-center">
                                      <div className="font-bold text-red-700">LEAVE</div>
                                      <div className="text-xs text-red-600">Day Off</div>
                                    </div>
                                  </div>
                                )}
                                {shift && shiftTime && (
                                  <div>
                                    <div className="font-bold text-green-700">{shift.name}</div>
                                    <div className="text-xs text-green-600">
                                      {shiftTime.startTime} - {shiftTime.endTime}
                                    </div>
                                  </div>
                                )}
                                {!shift && !onLeave && !unavail && (
                                  <div className="text-center text-gray-500 text-xs">No shift</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedEmployee.name}</h3>
                <p className="text-gray-600">{roles.find(r => r.id === selectedEmployee.roleId)?.name}</p>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Weekly availability grid */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {currentWeek.map((date, idx) => {
                const onLeave = isOnLeave(selectedEmployee.id, date);
                const unavail = isUnavailable(selectedEmployee.id, date);
                const shift = getShiftForEmployee(selectedEmployee.id, date);
                const shiftTime = shift ? getShiftTimeForDay(shift, date) : null;

                return (
                  <div key={date} className="border rounded-lg p-2 text-center">
                    <div className="font-semibold text-sm text-gray-900">{daysOfWeek[idx].slice(0, 3)}</div>
                    <div className="text-xs text-gray-500 mb-2">{date}</div>

                    {shift && shiftTime && !onLeave && !unavail && (
                      <div className="mb-2 text-xs bg-green-50 p-1 rounded border border-green-200">
                        <div className="font-semibold text-green-700">{shift.name}</div>
                        <div className="text-green-600">{shiftTime.startTime}</div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <button
                        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                          onLeave
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        L
                      </button>
                      <button
                        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                          unavail
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        U
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="border-t pt-4">
              <div className="text-sm text-gray-600 space-y-1">
                <div><span className="inline-block w-4 h-4 bg-green-100 border border-green-300 mr-2 rounded"></span>Shift assigned</div>
                <div><span className="inline-block w-4 h-4 bg-red-100 border border-red-300 mr-2 rounded"></span>Leave (L)</div>
                <div><span className="inline-block w-4 h-4 bg-orange-100 border border-orange-300 mr-2 rounded"></span>Unavailable (U)</div>
                <div><span className="inline-block w-4 h-4 bg-gray-50 border border-gray-300 mr-2 rounded"></span>No shift</div>
              </div>
            </div>

            <button
              onClick={() => setSelectedEmployee(null)}
              className="w-full mt-4 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendarView;
