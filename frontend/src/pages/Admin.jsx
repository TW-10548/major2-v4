import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import { format } from 'date-fns';
import api from '../services/api';
import {
  listUsers,
  listDepartments,
  listEmployees,
  createUser,
  createDepartment,
  updateDepartment,
  searchDepartments,
  deleteUser,
  deleteDepartment,
  checkUsernameAvailable,
  createManager,
  listManagers,
  updateManager,
  reassignManager,
  deleteManager,
  getAttendance
} from '../services/api';
import {
  Plus, AlertCircle, Users, Building2, UserCog, TrendingUp, Edit2, CheckCircle, Trash2, XCircle, Clock
} from 'lucide-react';

// =============== ADMIN PAGES ===============

const AdminDashboardHome = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDepartments: 0,
    totalManagers: 0,
    totalEmployees: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Auto-refresh dashboard every 30 seconds to show real-time counts
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptRes, empRes] = await Promise.all([
        listUsers(),
        listDepartments(),
        listEmployees(false)  // Get only active employees
      ]);
      const users = usersRes.data;
      const managers = users.filter(u => u.user_type === 'manager' && u.is_active === true);
      const employees = empRes.data;  // Use the filtered list from API
      
      setStats({
        totalUsers: users.filter(u => u.is_active === true).length,  // Count only active users
        totalDepartments: deptRes.data.length,
        totalManagers: managers.length,
        totalEmployees: employees.length
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue' },
    { title: 'Departments', value: stats.totalDepartments, icon: Building2, color: 'green' },
    { title: 'Managers', value: stats.totalManagers, icon: UserCog, color: 'purple' },
    { title: 'Employees', value: stats.totalEmployees, icon: TrendingUp, color: 'orange' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Admin Dashboard" subtitle="Manage your organization" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {statCards.map((stat, index) => (
            <Card key={index} padding={false}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                    <stat.icon className={`w-8 h-8 text-${stat.color}-600`} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card title="System Overview">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Recent Activity</h4>
              <p className="text-gray-600">System is running smoothly. All services operational.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Quick Stats</h4>
              <p className="text-gray-600">
                Managing {stats.totalDepartments} departments with {stats.totalManagers} managers
                overseeing {stats.totalEmployees} employees.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const AdminManagers = () => {
  const [managers, setManagers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reassignError, setReassignError] = useState('');
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [deptSearchResults, setDeptSearchResults] = useState([]);
  const [showDeptSearch, setShowDeptSearch] = useState(false);
  const [selectedDeptInfo, setSelectedDeptInfo] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showReassignConfirm, setShowReassignConfirm] = useState(false);
  const [showReassignWarning, setShowReassignWarning] = useState(false);
  const [existingManagerToReplace, setExistingManagerToReplace] = useState(null);
  const [showManagerConflict, setShowManagerConflict] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [newManagerData, setNewManagerData] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    department_id: ''
  });
  const [reassignData, setReassignData] = useState({
    department_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [managersRes, deptRes] = await Promise.all([
        listManagers(),
        listDepartments()
      ]);
      // Enhance manager data with user information from listUsers
      const usersRes = await listUsers();
      const usersMap = {};
      usersRes.data.forEach(user => {
        usersMap[user.id] = user;
      });
      
      const enhancedManagers = managersRes.data.map(manager => ({
        ...manager,
        ...usersMap[manager.user_id]
      }));
      
      setManagers(enhancedManagers);
      setDepartments(deptRes.data);
    } catch (error) {
      console.error('Failed to load managers:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeptSearch = async (query) => {
    setDeptSearchQuery(query);
    if (!query.trim()) {
      setDeptSearchResults([]);
      setShowDeptSearch(false);
      return;
    }

    try {
      const response = await searchDepartments(query);
      const results = Array.isArray(response.data) ? response.data : [response.data];
      setDeptSearchResults(results);
      setShowDeptSearch(true);
    } catch (error) {
      console.error('Failed to search departments:', error);
      setDeptSearchResults([]);
    }
  };

  const selectDepartment = (dept) => {
    setSelectedDeptInfo(dept);
    setFormData({
      ...formData,
      department_id: dept.id.toString()
    });
    setDeptSearchQuery(dept.name);
    setShowDeptSearch(false);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    
    if (!showCreateConfirm) {
      // Validate form before showing confirmation
      if (!formData.username?.trim() || !formData.email?.trim() || !formData.password?.trim() ||
          !formData.full_name?.trim() || !selectedDeptInfo) {
        setError('Please fill in all required fields');
        return;
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setError('Please enter a valid email address');
        return;
      }
      
      // Check if username is available
      setSubmitting(true);
      try {
        const isAvailable = await checkUsernameAvailable(formData.username.trim());
        if (!isAvailable) {
          setError(`Username "${formData.username.trim()}" already exists. Please choose a different username.`);
          setSubmitting(false);
          return;
        }
        setShowCreateConfirm(true);
      } catch (err) {
        setError('Failed to validate username availability');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    
    setSubmitting(true);
    setShowCreateConfirm(false);
    try {
      // Step 1: Create User account - trim all strings
      const userResponse = await createUser({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password.trim(),
        full_name: formData.full_name.trim(),
        user_type: 'manager'
      });
      
      // Step 2: Create Manager record linking user to department
      try {
        const managerRes = await createManager({
          user_id: userResponse.data.id,
          department_id: selectedDeptInfo.id
        });

        // Check if response indicates a conflict
        if (managerRes.data?.status === 'conflict') {
          // Manager already assigned - show confirmation dialog
          setConflictData(managerRes.data);
          setNewManagerData({
            user_id: userResponse.data.id,
            department_id: selectedDeptInfo.id
          });
          setShowManagerConflict(true);
          setSubmitting(false);
          return;
        }
        
        // Check for success
        if (managerRes.data?.status === 'success') {
          // Success - close modal and reset form
          setShowModal(false);
          setFormData({
            username: '',
            password: '',
            email: '',
            full_name: '',
            department_id: ''
          });
          setSelectedDeptInfo(null);
          setDeptSearchQuery('');
          setSubmitting(false);
          loadData();
        } else {
          // Unexpected response
          setError('Unexpected response from server');
          setSubmitting(false);
        }
      } catch (managerErr) {
        setError(managerErr.response?.data?.detail || 'Failed to create manager');
        setSubmitting(false);
      }
    } catch (err) {
      const errorDetail = err.response?.data?.detail || err.message || 'Failed to create user';
      setError(errorDetail);
      console.error('Create user error:', errorDetail);
      setSubmitting(false);
    }
  };

  const handleConfirmReassign = async () => {
    setSubmitting(true);
    setError('');
    try {
      // Reassign with force flag
      const response = await createManager(newManagerData, true);
      console.log('Reassign response:', response);
      console.log('Response status:', response.data?.status);
      
      // Check if successful
      if (response.data?.status === 'success') {
        // Success - close modals and reset form
        setShowManagerConflict(false);
        setShowModal(false);
        setFormData({
          username: '',
          password: '',
          email: '',
          full_name: '',
          department_id: ''
        });
        setSelectedDeptInfo(null);
        setDeptSearchQuery('');
        setConflictData(null);
        setNewManagerData(null);
        setSubmitting(false);
        loadData();
      } else {
        setError('Unexpected response from server: ' + JSON.stringify(response.data));
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Reassign error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to reassign manager');
      setSubmitting(false);
    }
  };

  const handleReassign = async (e) => {
    e.preventDefault();
    setReassignError('');

    if (!showReassignConfirm) {
      setShowReassignConfirm(true);
      return;
    }

    setSubmitting(true);
    try {
      await updateManager(selectedManager.id, {
        department_id: reassignData.department_id ? parseInt(reassignData.department_id) : null
      });
      setShowReassignModal(false);
      setShowReassignConfirm(false);
      setSelectedManager(null);
      loadData();
    } catch (err) {
      if (err.response?.status === 409) {
        // Manager already assigned - show reassignment option
        setShowReassignWarning(true);
      } else {
        setReassignError(err.response?.data?.detail || err.message || 'Failed to reassign manager');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassignForce = async () => {
    setReassignError('');
    setSubmitting(true);
    try {
      await reassignManager(selectedManager.id, {
        department_id: reassignData.department_id ? parseInt(reassignData.department_id) : null
      });
      setShowReassignModal(false);
      setShowReassignWarning(false);
      setShowReassignConfirm(false);
      setSelectedManager(null);
      loadData();
    } catch (err) {
      setReassignError(err.response?.data?.detail || err.message || 'Failed to reassign manager');
    } finally {
      setSubmitting(false);
    }
  };

  const openReassignModal = (manager) => {
    setSelectedManager(manager);
    setReassignData({ department_id: manager.department_id || '' });
    setShowReassignModal(true);
  };

  const confirmDelete = (manager) => {
    setDeleteTarget(manager);
    setShowDeleteConfirm(true);
  };

  const handleDeleteManager = async () => {
    setSubmitting(true);
    try {
      await deleteManager(deleteTarget.id);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      alert('Failed to delete manager: ' + (err.response?.data?.detail || err.message));
      setShowDeleteConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { header: 'Manager ID', accessor: 'manager_id', width: '100px' },
    { header: 'Username', accessor: 'username', width: '120px' },
    { header: 'Full Name', accessor: 'full_name', width: '180px' },
    { header: 'Email', accessor: 'email', width: '180px' },
    {
      header: 'Department',
      width: '150px',
      render: (row) => {
        const dept = departments.find(d => d.id === row.department_id);
        return (
          <span className="font-medium">
            {dept ? dept.name : <span className="text-gray-400">Unassigned</span>}
          </span>
        );
      }
    },
    {
      header: 'Status',
      width: '100px',
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      width: '100px',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openReassignModal(row)}
            className="flex items-center gap-1"
          >
            <Edit2 className="w-4 h-4" />
            Reassign
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => confirmDelete(row)}
            className="flex items-center gap-1 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      )
    }
  ];

  if (loading) return (
    <div className="p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-500">Loading managers...</div>
      </div>
    </div>
  );

  return (
    <div>
      <Header title="Managers" subtitle="Create and manage department managers" />
      <div className="p-6 space-y-6">
        <Card
          title="All Managers"
          subtitle={`${managers.length} total managers`}
          headerAction={
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Manager
            </Button>
          }
        >
          {managers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No managers yet. Create one to get started.</p>
            </div>
          ) : (
            <Table columns={columns} data={managers} />
          )}
        </Card>

        {/* Create Manager Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setError('');
            setDeptSearchQuery('');
            setDeptSearchResults([]);
            setShowDeptSearch(false);
            setSelectedDeptInfo(null);
          }}
          title="Create New Manager"
          footer={
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setError('');
                  setDeptSearchQuery('');
                  setDeptSearchResults([]);
                  setShowDeptSearch(false);
                  setSelectedDeptInfo(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !formData.username?.trim() || !formData.password?.trim() || !formData.email?.trim() || !formData.full_name?.trim() || !selectedDeptInfo}
              >
                {submitting ? 'Creating...' : 'Create Manager'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department (Search by ID or Name)</label>
              <div className="relative">
                <input
                  type="text"
                  value={deptSearchQuery}
                  onChange={(e) => handleDeptSearch(e.target.value)}
                  onFocus={() => deptSearchQuery && setShowDeptSearch(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Search by department name, code, or ID (e.g., 'Assembly', '001', or '1')"
                  disabled={submitting}
                />
                {selectedDeptInfo && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      Selected: {selectedDeptInfo.name} (Dept ID: {selectedDeptInfo.dept_id})
                    </p>
                  </div>
                )}
                {showDeptSearch && deptSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {deptSearchResults.map((dept) => (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => selectDepartment(dept)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="font-medium text-gray-900">{dept.name}</p>
                        <p className="text-sm text-gray-600">Dept ID: {dept.dept_id} | ID: {dept.id} {dept.description ? '- ' + dept.description : ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>
        </Modal>

        {/* Reassign Manager Modal */}
        <Modal
          isOpen={showReassignModal}
          onClose={() => {
            setShowReassignModal(false);
            setReassignError('');
            setSelectedManager(null);
          }}
          title={`Reassign ${selectedManager?.full_name || 'Manager'}`}
          footer={
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReassignModal(false);
                  setReassignError('');
                  setSelectedManager(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReassign}
                disabled={submitting}
              >
                {submitting ? 'Reassigning...' : 'Reassign Manager'}
              </Button>
            </div>
          }
        >
          {reassignError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{reassignError}</span>
            </div>
          )}
          {selectedManager && (
            <form onSubmit={handleReassign} className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Manager:</strong> {selectedManager.full_name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Department</label>
                <select
                  value={reassignData.department_id}
                  onChange={(e) => setReassignData({ department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  disabled={submitting}
                >
                  <option value="">Unassign from department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </form>
          )}
        </Modal>

        {/* Create Manager Confirmation Modal */}
        <Modal
          isOpen={showCreateConfirm}
          onClose={() => {
            setShowCreateConfirm(false);
          }}
          title="Confirm Create Manager"
          footer={
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateConfirm(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? 'Creating...' : 'Confirm Create'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-900 font-medium">Create new manager?</p>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Username:</strong> {formData.username}</p>
              <p><strong>Full Name:</strong> {formData.full_name}</p>
              <p><strong>Email:</strong> {formData.email}</p>
              <p><strong>Department:</strong> {selectedDeptInfo?.name}</p>
            </div>
          </div>
        </Modal>

        {/* Reassign Confirmation Modal */}
        <Modal
          isOpen={showReassignConfirm}
          onClose={() => {
            setShowReassignConfirm(false);
          }}
          title="Confirm Reassign Manager"
          footer={
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReassignConfirm(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReassign}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? 'Reassigning...' : 'Confirm Reassign'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 font-medium">Reassign manager to different department?</p>
            </div>
            {selectedManager && (
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Manager:</strong> {selectedManager.full_name}</p>
                <p><strong>Current Department:</strong> {departments.find(d => d.id === selectedManager.department_id)?.name}</p>
                <p><strong>New Department:</strong> {reassignData.department_id ? departments.find(d => d.id === parseInt(reassignData.department_id))?.name : 'Unassigned'}</p>
              </div>
            )}
          </div>
        </Modal>

        {/* Manager Already Assigned Warning Modal */}
        <Modal
          isOpen={showReassignWarning}
          onClose={() => {
            setShowReassignWarning(false);
          }}
          title="Manager Already Assigned"
          footer={
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReassignWarning(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReassignForce}
                disabled={submitting}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {submitting ? 'Reassigning...' : 'Yes, Reassign'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-900 font-medium">
                Manager already assigned to this department. Do you want to reassign?
              </p>
            </div>
            <p className="text-sm text-gray-600">
              The current manager will be deactivated and this manager will be assigned to the department.
            </p>
          </div>
        </Modal>

        {/* Manager Conflict Confirmation Modal */}
        <Modal
          isOpen={showManagerConflict}
          onClose={() => {
            setShowManagerConflict(false);
            setConflictData(null);
            setNewManagerData(null);
            setError('');
          }}
          title="Manager Already Assigned"
          footer={
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowManagerConflict(false);
                  setConflictData(null);
                  setNewManagerData(null);
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReassign}
                disabled={submitting}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {submitting ? 'Reassigning...' : 'Yes, Reassign'}
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
          {conflictData && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-900 font-medium text-lg">
                  ⚠️ Manager Already Assigned to This Department
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Current Manager:</p>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                    <p className="text-sm"><strong>Name:</strong> {conflictData.existing_manager.full_name}</p>
                    <p className="text-sm"><strong>Email:</strong> {conflictData.existing_manager.email}</p>
                    <p className="text-sm"><strong>Username:</strong> {conflictData.existing_manager.username}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">New Manager:</p>
                  <div className="bg-blue-50 p-3 rounded-lg space-y-1">
                    <p className="text-sm"><strong>Name:</strong> {formData.full_name}</p>
                    <p className="text-sm"><strong>Email:</strong> {formData.email}</p>
                    <p className="text-sm"><strong>Username:</strong> {formData.username}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  ℹ️ If you proceed, the current manager will be unassigned from this department and the new manager will be assigned.
                </p>
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
          }}
          title="Confirm Delete Manager"
          footer={
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteManager}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {submitting ? 'Deleting...' : 'Delete Manager'}
              </Button>
            </div>
          }
        >
          {deleteTarget && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-900 font-medium">Are you sure you want to delete this manager?</p>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Username:</strong> {deleteTarget.username}</p>
                <p><strong>Name:</strong> {deleteTarget.full_name}</p>
                <p><strong>Email:</strong> {deleteTarget.email}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-900">
                  ⚠️ This action will remove the manager from all assigned departments but will not delete the departments themselves.
                </p>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

// =============== ADMIN DEPARTMENTS COMPONENT ===============

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptDetails, setDeptDetails] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0 });
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [empDownloadMonth, setEmpDownloadMonth] = useState(new Date().getMonth() + 1);
  const [empDownloadYear, setEmpDownloadYear] = useState(new Date().getFullYear());
  const [empDownloading, setEmpDownloading] = useState(false);
  const [formData, setFormData] = useState({
    dept_id: '',
    name: '',
    description: ''
  });
  const [viewMode, setViewMode] = useState('all'); // 'all' = all employees, 'today' = today's attendance

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await listDepartments();
      setDepartments(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load departments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDeptDetails = async (deptId) => {
    try {
      setLoading(true);
      const response = await api.get(`/departments/${deptId}/details`);
      setDeptDetails(response.data);
      setSelectedDept(deptId);
      setViewMode('all'); // Reset to show all employees
      
      // Load today's attendance for stats
      const today = format(new Date(), 'yyyy-MM-dd');
      const attendanceResponse = await getAttendance(today, today);
      setAttendance(attendanceResponse.data);
      
      // Calculate stats
      let present = 0, late = 0, absent = 0;
      attendanceResponse.data.forEach(record => {
        if (record.in_time) {
          if (record.status === 'on-time' || record.status === 'onTime') present++;
          else late++;
        } else {
          absent++;
        }
      });
      setStats({ present, late, absent });
      
      setError('');
    } catch (err) {
      setError('Failed to load department details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeptSelect = (e) => {
    const deptId = parseInt(e.target.value);
    if (deptId) {
      loadDeptDetails(deptId);
    } else {
      setSelectedDept(null);
      setDeptDetails(null);
    }
  };

  const formatTime = (dateTime) => {
    if (!dateTime) return '-';
    return format(new Date(dateTime), 'HH:mm:ss');
  };

  const formatDate = (dateTime) => {
    if (!dateTime) return '-';
    return format(new Date(dateTime), 'MMM dd, yyyy');
  };

  const downloadMonthlyReport = async () => {
    if (!selectedDept) {
      setError('Please select a department first');
      return;
    }
    try {
      const response = await api.get(`/attendance/export/monthly?department_id=${selectedDept}&year=${selectedYear}&month=${selectedMonth}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download monthly report');
      console.error(err);
    }
  };

  const downloadWeeklyReport = async () => {
    if (!selectedDept) {
      setError('Please select a department first');
      return;
    }
    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - dayOfWeek);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      
      const response = await api.get(`/attendance/export/weekly?department_id=${selectedDept}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_weekly_${startDate.toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download weekly report');
      console.error(err);
    }
  };

  const downloadEmployeeMonthly = async () => {
    if (!employeeIdInput) {
      alert('Please enter an Employee ID');
      return;
    }

    try {
      setEmpDownloading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/attendance/export/employee-monthly?year=${empDownloadYear}&month=${empDownloadMonth}&employee_id=${employeeIdInput}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employee_${employeeIdInput}_attendance_${empDownloadYear}-${String(empDownloadMonth).padStart(2, '0')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download employee report');
    } finally {
      setEmpDownloading(false);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.dept_id?.trim() || !formData.name?.trim()) {
      setModalError('Department ID and Name are required');
      return;
    }

    setSubmitting(true);
    try {
      await createDepartment({
        dept_id: formData.dept_id.trim(),
        name: formData.name.trim(),
        description: formData.description.trim()
      });
      setShowModal(false);
      setFormData({
        dept_id: '',
        name: '',
        description: ''
      });
      loadDepartments();
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  const employeeColumns = [
    { key: 'employee_id', label: 'Employee ID', width: '120px' },
    { 
      key: 'name', 
      label: 'Name', 
      width: '200px',
      render: (row) => `${row.first_name} ${row.last_name}`
    },
    { key: 'email', label: 'Email', width: '200px' },
    { 
      key: 'assigned_shift', 
      label: 'Assigned Shift Time', 
      width: '180px',
      render: (row) => row.assigned_shift_time || '-'
    },
    { 
      key: 'total_hrs_assigned', 
      label: 'Total Hrs Assigned', 
      width: '150px',
      render: (row) => row.total_hrs_assigned ? `${row.total_hrs_assigned} hrs` : '-'
    },
    { 
      key: 'check_in', 
      label: 'Check-In', 
      width: '130px',
      render: (row) => formatTime(row.latest_check_in)
    },
    { 
      key: 'check_out', 
      label: 'Check-Out', 
      width: '130px',
      render: (row) => formatTime(row.latest_check_out)
    },
    { 
      key: 'total_hrs_worked', 
      label: 'Total Hrs Worked', 
      width: '150px',
      render: (row) => {
        if (!row.latest_check_in || !row.latest_check_out) return '-';
        const checkIn = new Date(row.latest_check_in);
        const checkOut = new Date(row.latest_check_out);
        const diffMs = checkOut - checkIn;
        const hours = (diffMs / (1000 * 60 * 60)).toFixed(2);
        return `${hours} hrs`;
      }
    },
    { 
      key: 'break_time', 
      label: 'Break Time', 
      width: '120px',
      render: () => '1 hr'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Department Management</h1>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2 inline" />
            Add Department
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Departments List */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Departments</h2>
              {loading && !departments.length ? (
                <p className="text-gray-600 text-center py-4">Loading...</p>
              ) : (
                <div className="space-y-2">
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => loadDeptDetails(dept.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition ${
                        selectedDept === dept.id
                          ? 'bg-blue-500 text-white font-semibold'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      <div className="font-medium">{dept.name}</div>
                      <div className="text-xs opacity-75">{dept.dept_id}</div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Department Details */}
          <div className="lg:col-span-2">
            {loading && (
              <Card className="text-center py-8">
                <p className="text-gray-600">Loading...</p>
              </Card>
            )}

            {deptDetails && (
              <>
                {/* Department Header */}
                <Card className="mb-8 bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{deptDetails.name}</h2>
                      <p className="text-gray-600 mb-1">
                        <span className="font-semibold">Department ID:</span> {deptDetails.dept_id}
                      </p>
                      {deptDetails.description && (
                        <p className="text-gray-600">
                          <span className="font-semibold">Description:</span> {deptDetails.description}
                        </p>
                      )}
                    </div>

                    {/* Manager Info */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Department Manager</h3>
                      {deptDetails.manager ? (
                        <div>
                          <p className="text-gray-700 font-medium">{deptDetails.manager.full_name}</p>
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Username:</span> {deptDetails.manager.username}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Email:</span> {deptDetails.manager.email}
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No manager assigned</p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Department Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <Card padding={false}>
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Total Employees</p>
                          <p className="text-4xl font-bold text-blue-600">{deptDetails.employees?.length || 0}</p>
                        </div>
                        <Users className="w-10 h-10 text-blue-500" />
                      </div>
                    </div>
                  </Card>
                  <Card padding={false}>
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Present Today</p>
                          <p className="text-4xl font-bold text-green-600">{stats.present}</p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-green-500" />
                      </div>
                    </div>
                  </Card>
                  <Card padding={false}>
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Attendance Rate</p>
                          <p className="text-4xl font-bold text-purple-600">
                            {deptDetails.employees?.length > 0 
                              ? Math.round((stats.present / deptDetails.employees.length) * 100) 
                              : 0}%
                          </p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-purple-500" />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Employees Table */}
                <Card>
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Employees ({viewMode === 'all' ? deptDetails.employees.length : stats.present})
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewMode('all')}
                          className={`px-4 py-2 rounded-lg font-medium transition ${
                            viewMode === 'all'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          All Employees
                        </button>
                        <button
                          onClick={() => setViewMode('today')}
                          className={`px-4 py-2 rounded-lg font-medium transition ${
                            viewMode === 'today'
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Today's Attendance
                        </button>
                      </div>
                    </div>

                    {/* Month Selector and Download Buttons */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Select Month & Year</label>
                          <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                              <option key={m} value={m}>
                                {new Date(2024, m - 1).toLocaleString('default', { month: 'long' })}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                          <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={downloadMonthlyReport}
                            className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition"
                          >
                            📥 Download Monthly
                          </button>
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={downloadWeeklyReport}
                            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
                          >
                            📥 Download Weekly
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Employee Monthly Report Download Section */}
                  <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">📄 Download Individual Employee Monthly Report</h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                        <input
                          type="text"
                          placeholder="e.g., EMP001"
                          value={employeeIdInput}
                          onChange={(e) => setEmployeeIdInput(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                        <select
                          value={empDownloadMonth}
                          onChange={(e) => setEmpDownloadMonth(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                              {new Date(2024, m - 1).toLocaleString('default', { month: 'long' })}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <select
                          value={empDownloadYear}
                          onChange={(e) => setEmpDownloadYear(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={downloadEmployeeMonthly}
                          disabled={empDownloading}
                          className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
                        >
                          {empDownloading ? '⏳ Downloading...' : '📥 Download'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Toggle Stats for Today's Attendance View */}
                  {viewMode === 'today' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card padding={false}>
                        <div className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Present</p>
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
                            <AlertCircle className="w-8 h-8 text-yellow-600" />
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
                  )}

                  {/* View Mode: All Employees */}
                  {viewMode === 'all' ? (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                          All Employees in Department
                        </h3>
                      </div>
                      
                      {deptDetails.employees.length === 0 ? (
                        <div className="text-center py-12">
                          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500">No employees in this department</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {deptDetails.employees.map((emp, idx) => {
                                // Check if employee has attendance today
                                const hasAttendanceToday = attendance.some(a => a.employee_id === emp.id);
                                const attendanceRecord = attendance.find(a => a.employee_id === emp.id);
                                
                                return (
                                  <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{emp.employee_id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{emp.first_name} {emp.last_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{emp.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                      {hasAttendanceToday ? (
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          attendanceRecord?.status === 'on-time' || attendanceRecord?.status === 'onTime'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {attendanceRecord?.in_time ? 'Present' : 'Scheduled'}
                                        </span>
                                      ) : (
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                          Not Scheduled
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* View Mode: Today's Attendance */
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Today's Attendance - {format(new Date(), 'MMMM dd, yyyy')}
                        </h3>
                      </div>
                      
                      {attendance.length === 0 ? (
                        <div className="text-center py-12">
                          <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500">No scheduled shifts for today</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Shift</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Hrs Assigned</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-In</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-Out</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Hrs Worked</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Break Time</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overtime Hours</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {attendance.map((record) => {
                              const calculateTotalAssignedHours = () => {
                                if (!record.schedule?.start_time || !record.schedule?.end_time) return '-';
                                const [startH, startM] = record.schedule.start_time.split(':').map(Number);
                                const [endH, endM] = record.schedule.end_time.split(':').map(Number);
                                const start = startH + startM / 60;
                                const end = endH + endM / 60;
                                const hours = end > start ? end - start : 24 - start + end;
                                return hours.toFixed(2);
                              };

                              return (
                                <tr key={record.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                    {record.employee?.employee_id || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    {record.employee?.first_name} {record.employee?.last_name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {record.schedule?.role?.name || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {record.schedule ? `${record.schedule.start_time} - ${record.schedule.end_time}` : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                    {calculateTotalAssignedHours()} hrs
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {record.in_time ? record.in_time : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {record.out_time ? record.out_time : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                    {record.worked_hours !== null && record.worked_hours !== undefined ? record.worked_hours.toFixed(2) : '-'} hrs
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {record.break_minutes} min
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                                    {record.overtime_hours ? record.overtime_hours.toFixed(2) : '-'} hrs
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
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    </div>
                  )}
                </Card>
              </>
            )}

            {!deptDetails && !loading && (
              <Card className="text-center py-12">
                <p className="text-gray-500 text-lg">Select a department from the list to view details</p>
              </Card>
            )}
          </div>
        </div>

        {/* Add Department Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setModalError('');
            setFormData({
              dept_id: '',
              name: '',
              description: ''
            });
          }}
          title="Add New Department"
          footer={
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setModalError('');
                  setFormData({
                    dept_id: '',
                    name: '',
                    description: ''
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddDepartment}
                disabled={submitting || !formData.dept_id?.trim() || !formData.name?.trim()}
              >
                {submitting ? 'Creating...' : 'Create Department'}
              </Button>
            </div>
          }
        >
          {modalError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{modalError}</span>
            </div>
          )}
          <form onSubmit={handleAddDepartment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department ID</label>
              <input
                type="text"
                value={formData.dept_id}
                onChange={(e) => setFormData({ ...formData, dept_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., 001, 002, 003"
                disabled={submitting}
              />
              <p className="text-xs text-gray-500 mt-1">3-digit department identifier (e.g., 001)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., Engineering, Sales, HR"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter department description..."
                rows="3"
                disabled={submitting}
              />
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

// =============== MAIN ADMIN DASHBOARD COMPONENT ===============

const AdminDashboard = ({ user, onLogout }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={<AdminDashboardHome />} />
            <Route path="/managers" element={<AdminManagers />} />
            <Route path="/departments" element={<AdminDepartments />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
