import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, ChevronDown } from 'lucide-react';
import api from '../services/api';

const ShiftManagement = ({ currentUser, departmentId }) => {
  const [shifts, setShifts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [expandedShift, setExpandedShift] = useState(null);
  const [loading, setLoading] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const [shiftForm, setShiftForm] = useState({
    role_id: '',
    name: '',
    start_time: '09:00',
    end_time: '17:00',
    priority: 50,
    schedule_config: {}
  });

  useEffect(() => {
    loadData();
  }, [departmentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load roles
      const rolesRes = await api.get('/roles');
      setRoles(rolesRes.data);

      // Load shifts
      const shiftsRes = await api.get('/shifts');
      console.log('Loaded shifts:', shiftsRes.data);
      setShifts(shiftsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeScheduleConfig = (roleId) => {
    const config = {};
    daysOfWeek.forEach(day => {
      config[day] = {
        enabled: false,
        startTime: '09:00',
        endTime: '17:00',
        dayPriority: 1,
        multiple: []
      };
    });
    return config;
  };

  const handleNewShift = () => {
    setShiftForm({
      role_id: '',
      name: '',
      start_time: '09:00',
      end_time: '17:00',
      priority: 50,
      schedule_config: {}
    });
    setEditingShift(null);
    setShowForm(true);
  };

  const handleEditShift = (shift) => {
    // Ensure schedule_config has all days with proper structure
    let config = shift.schedule_config || {};
    
    // Validate and normalize the schedule_config
    const normalizedConfig = {};
    daysOfWeek.forEach(day => {
      if (config[day] && typeof config[day] === 'object') {
        normalizedConfig[day] = {
          enabled: config[day].enabled || false,
          startTime: config[day].startTime || '09:00',
          endTime: config[day].endTime || '17:00',
          dayPriority: config[day].dayPriority || 1
        };
      } else {
        normalizedConfig[day] = {
          enabled: false,
          startTime: '09:00',
          endTime: '17:00',
          dayPriority: 1
        };
      }
    });
    
    setShiftForm({
      role_id: shift.role_id,
      name: shift.name,
      start_time: shift.start_time || '09:00',
      end_time: shift.end_time || '17:00',
      priority: shift.priority,
      schedule_config: normalizedConfig
    });
    setEditingShift(shift.id);
    setShowForm(true);
  };

  const handleSaveShift = async () => {
    if (!shiftForm.role_id || !shiftForm.name) {
      alert('Please fill all required fields');
      return;
    }

    // Ensure schedule_config has all days
    const config = { ...shiftForm.schedule_config };
    daysOfWeek.forEach(day => {
      if (!config[day]) {
        config[day] = {
          enabled: false,
          startTime: '09:00',
          endTime: '17:00',
          dayPriority: 1
        };
      }
    });

    // Check that at least one day is enabled
    const enabledDays = Object.values(config).filter(d => d && d.enabled).length;
    if (enabledDays === 0) {
      alert('Please select at least one working day for this shift');
      return;
    }

    // Calculate shift start_time and end_time from enabled days
    let minStartTime = '23:59';
    let maxEndTime = '00:00';
    
    Object.values(config).forEach(dayConfig => {
      if (dayConfig && dayConfig.enabled) {
        const startTime = dayConfig.startTime || '09:00';
        const endTime = dayConfig.endTime || '17:00';
        if (startTime < minStartTime) minStartTime = startTime;
        if (endTime > maxEndTime) maxEndTime = endTime;
      }
    });

    const payload = {
      ...shiftForm,
      start_time: minStartTime,
      end_time: maxEndTime,
      schedule_config: config
    };

    console.log('Saving shift with payload:', payload);

    try {
      if (editingShift) {
        console.log(`Updating shift ${editingShift}`);
        await api.put(`/shifts/${editingShift}`, payload);
      } else {
        console.log('Creating new shift');
        await api.post('/shifts', payload);
      }
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Error saving shift:', error);
      alert('Failed to save shift');
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm('Delete this shift?')) return;

    try {
      await api.delete(`/shifts/${shiftId}`);
      await loadData();
    } catch (error) {
      console.error('Error deleting shift:', error);
      alert('Failed to delete shift');
    }
  };

  const handleDayToggle = (day) => {
    const config = { ...shiftForm.schedule_config };
    if (!config[day]) {
      config[day] = {
        enabled: false,
        startTime: '09:00',
        endTime: '17:00',
        dayPriority: 1
      };
    }
    config[day].enabled = !config[day].enabled;
    setShiftForm({ ...shiftForm, schedule_config: config });
  };

  const handleDayChange = (day, field, value) => {
    const config = { ...shiftForm.schedule_config };
    if (!config[day]) {
      config[day] = {
        enabled: false,
        startTime: '09:00',
        endTime: '17:00',
        dayPriority: 1
      };
    }
    config[day][field] = field === 'dayPriority' ? parseInt(value) : value;
    setShiftForm({ ...shiftForm, schedule_config: config });
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Unknown Role';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Shift Management</h2>
        <button
          onClick={handleNewShift}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          New Shift Type
        </button>
      </div>

      {/* Shift Form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">{editingShift ? 'Edit Shift' : 'Create New Shift'}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={shiftForm.role_id}
                onChange={(e) => {
                  setShiftForm({
                    ...shiftForm,
                    role_id: e.target.value,
                    schedule_config: initializeScheduleConfig(e.target.value)
                  });
                }}
                className="w-full border rounded px-3 py-2"
                disabled={editingShift}
              >
                <option value="">Select role...</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Shift Name</label>
              <input
                type="text"
                value={shiftForm.name}
                onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                placeholder="e.g., Morning Shift, Evening Shift"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Priority (1-100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={shiftForm.priority}
                onChange={(e) => setShiftForm({ ...shiftForm, priority: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">Higher priority = more employees assigned</p>
            </div>
          </div>

          {/* Schedule Configuration */}
          <div className="space-y-3 bg-white p-4 rounded border">
            <h4 className="font-medium">Weekly Schedule</h4>
            <p className="text-sm text-gray-600">Enable days and set times for this shift:</p>

            {daysOfWeek.map(day => (
              <div key={day} className="border-b pb-3 last:border-b-0">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={shiftForm.schedule_config[day]?.enabled || false}
                    onChange={() => handleDayToggle(day)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium w-20">{day}</span>

                  {shiftForm.schedule_config[day]?.enabled && (
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div>
                        <input
                          type="time"
                          value={shiftForm.schedule_config[day]?.startTime || '09:00'}
                          onChange={(e) => handleDayChange(day, 'startTime', e.target.value)}
                          className="border rounded px-2 py-1 text-sm w-full"
                        />
                        <label className="text-xs text-gray-500">Start</label>
                      </div>

                      <div>
                        <input
                          type="time"
                          value={shiftForm.schedule_config[day]?.endTime || '17:00'}
                          onChange={(e) => handleDayChange(day, 'endTime', e.target.value)}
                          className="border rounded px-2 py-1 text-sm w-full"
                        />
                        <label className="text-xs text-gray-500">End</label>
                      </div>

                      <div>
                        <select
                          value={shiftForm.schedule_config[day]?.dayPriority || 1}
                          onChange={(e) => handleDayChange(day, 'dayPriority', e.target.value)}
                          className="border rounded px-2 py-1 text-sm w-full"
                        >
                          <option value="1">Low</option>
                          <option value="2">Medium</option>
                          <option value="3">High</option>
                        </select>
                        <label className="text-xs text-gray-500">Day Priority</label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveShift}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              <Save className="w-4 h-4" />
              Save Shift
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Shifts List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center py-4 text-gray-500">Loading...</p>
        ) : shifts.length === 0 ? (
          <p className="text-center py-4 text-gray-500">No shifts found. Create one to get started.</p>
        ) : (
          shifts.map(shift => (
            <div key={shift.id} className="border rounded-lg bg-white hover:shadow-md transition">
              <button
                onClick={() => setExpandedShift(expandedShift === shift.id ? null : shift.id)}
                className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50"
              >
                <div>
                  <h3 className="font-semibold text-lg">{shift.name}</h3>
                  <p className="text-sm text-gray-600">Role: {getRoleName(shift.role_id)}</p>
                  <div className="flex gap-4 mt-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Priority: {shift.priority}
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {Object.values(shift.schedule_config || {}).filter(d => d.enabled).length} days/week
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition ${expandedShift === shift.id ? 'rotate-180' : ''}`}
                />
              </button>

              {expandedShift === shift.id && (
                <div className="border-t bg-gray-50 p-4 space-y-3">
                  {/* Schedule Details */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Weekly Schedule:</h4>
                    <div className="grid grid-cols-7 gap-1 text-xs">
                      {daysOfWeek.map(day => {
                        const dayConfig = shift.schedule_config[day];
                        if (!dayConfig?.enabled) return <div key={day} className="p-2 bg-gray-200 rounded text-center">-</div>;
                        return (
                          <div key={day} className="p-2 bg-blue-100 rounded text-center">
                            <div className="font-medium">{day.slice(0, 3)}</div>
                            <div className="text-xs">{dayConfig.startTime}-{dayConfig.endTime}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t">
                    <button
                      onClick={() => handleEditShift(shift)}
                      className="flex items-center gap-2 flex-1 bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600 text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteShift(shift.id)}
                      className="flex items-center gap-2 flex-1 bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ShiftManagement;
