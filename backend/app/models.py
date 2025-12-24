"""
Database Models for Shift Scheduler - Normalized Schema V6
Optimized with clean foreign key relationships
"""

from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, JSON, Date, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class UserType(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class User(Base):
    """User model for authentication (Admin, Manager, Employee logins)"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    user_type = Column(SQLEnum(UserType), nullable=False)  # admin, manager, employee
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender", cascade="all, delete-orphan")
    received_messages = relationship("Message", foreign_keys="Message.recipient_id", back_populates="recipient", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Department(Base):
    """Department model - Master table for all departments"""
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    dept_id = Column(String(3), unique=True, nullable=False, index=True)  # 3-digit auto-generated dept ID (001, 002, etc.)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships - all operational tables reference this
    managers = relationship("Manager", back_populates="department", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="department", cascade="all, delete-orphan")
    roles = relationship("Role", back_populates="department", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="department", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="department", cascade="all, delete-orphan")


class Manager(Base):
    """Manager model - Links user to department"""
    __tablename__ = "managers"

    id = Column(Integer, primary_key=True, index=True)
    manager_id = Column(String(10), unique=True, nullable=False, index=True)  # 3-digit manager ID like "001"
    user_id = Column(Integer, ForeignKey('users.id', name='fk_manager_user'), nullable=False, unique=True, index=True)
    department_id = Column(Integer, ForeignKey('departments.id', name='fk_manager_department'), nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
    department = relationship("Department", back_populates="managers")
    leave_requests = relationship("LeaveRequest", back_populates="manager")


class Employee(Base):
    """Employee model"""
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(10), unique=True, nullable=False, index=True)  # 5-digit employee ID like "00001"
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    phone = Column(String(20))
    address = Column(Text)
    department_id = Column(Integer, ForeignKey('departments.id', name='fk_emp_department'), nullable=False)
    role_id = Column(Integer, ForeignKey('roles.id', name='fk_emp_role'), nullable=True)
    user_id = Column(Integer, ForeignKey('users.id', name='fk_emp_user'), nullable=True)
    employment_type = Column(String(20), default='full_time')  # 'full_time' or 'part_time'
    weekly_hours = Column(Float, default=40)
    daily_max_hours = Column(Float, default=8)
    shifts_per_week = Column(Integer, default=5)
    paid_leave_per_year = Column(Integer, default=10)  # Paid leave days per year
    skills = Column(JSON, default=list)
    hire_date = Column(Date)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="employees")
    role = relationship("Role", back_populates="employees")
    user = relationship("User", foreign_keys=[user_id])
    schedules = relationship("Schedule", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")
    check_ins = relationship("CheckInOut", back_populates="employee", cascade="all, delete-orphan")
    overtime_tracking = relationship("OvertimeTracking", back_populates="employee", cascade="all, delete-orphan")
    overtime_requests = relationship("OvertimeRequest", back_populates="employee", cascade="all, delete-orphan")
    overtime_worked = relationship("OvertimeWorked", back_populates="employee", cascade="all, delete-orphan")
    comp_off_requests = relationship("CompOffRequest", back_populates="employee", cascade="all, delete-orphan")
    comp_off_tracking = relationship("CompOffTracking", back_populates="employee", cascade="all, delete-orphan")


class Role(Base):
    """Role/Position Type model"""
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    department_id = Column(Integer, ForeignKey('departments.id', name='fk_role_department'), nullable=False)
    priority = Column(Integer, default=50)
    priority_percentage = Column(Integer, default=50)
    required_skills = Column(JSON, default=list)
    break_minutes = Column(Integer, default=60)
    weekend_required = Column(Boolean, default=False)
    schedule_config = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="roles")
    employees = relationship("Employee", back_populates="role")
    schedules = relationship("Schedule", back_populates="role", cascade="all, delete-orphan")
    shifts = relationship("Shift", back_populates="role", cascade="all, delete-orphan")


class Schedule(Base):
    """Schedule/Shift Assignment model"""
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey('departments.id', name='fk_schedule_department'), nullable=False)
    employee_id = Column(Integer, ForeignKey('employees.id', name='fk_schedule_employee'), nullable=False)
    role_id = Column(Integer, ForeignKey('roles.id', name='fk_schedule_role'), nullable=False)
    shift_id = Column(Integer, ForeignKey('shifts.id', name='fk_schedule_shift'), nullable=True)  # Optional - can be custom if None
    date = Column(Date, nullable=False, index=True)
    start_time = Column(String(5))
    end_time = Column(String(5))
    status = Column(String(20), default='scheduled')  # scheduled, completed, missed, cancelled
    notes = Column(Text)
    day_priority = Column(Integer, default=1)  # For priority-based distribution
    is_overtime = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="schedules")
    employee = relationship("Employee", back_populates="schedules")
    role = relationship("Role", back_populates="schedules")
    shift = relationship("Shift")  # Reference to assigned shift (if any)
    check_in = relationship("CheckInOut", back_populates="schedule", uselist=False, cascade="all, delete-orphan")
    attendance = relationship("Attendance", back_populates="schedule", uselist=False, cascade="all, delete-orphan")


class LeaveRequest(Base):
    """Leave requests with approval workflow"""
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id', name='fk_leave_employee'), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    leave_type = Column(String(20), nullable=False)
    duration_type = Column(String(20), default='full_day')  # full_day, half_day_morning, half_day_afternoon
    reason = Column(Text)
    status = Column(SQLEnum(LeaveStatus), default=LeaveStatus.PENDING)
    manager_id = Column(Integer, ForeignKey('managers.id', name='fk_leave_manager'))
    reviewed_at = Column(DateTime)
    review_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    employee = relationship("Employee", back_populates="leave_requests")
    manager = relationship("Manager", back_populates="leave_requests")


class CheckInOut(Base):
    """Employee Check-In/Out tracking"""
    __tablename__ = "check_ins"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id', name='fk_checkin_employee'), nullable=False)
    schedule_id = Column(Integer, ForeignKey('schedules.id', name='fk_checkin_schedule'), nullable=True)
    date = Column(Date, nullable=False, index=True)
    check_in_time = Column(DateTime)
    check_out_time = Column(DateTime)
    check_in_status = Column(String(20))  # onTime, slightlyLate, late, veryLate
    check_out_status = Column(String(20))
    location = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee", back_populates="check_ins")
    schedule = relationship("Schedule", back_populates="check_in")


class Attendance(Base):
    """Attendance records with worked hours tracking"""
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id', name='fk_attendance_employee'), nullable=False)
    schedule_id = Column(Integer, ForeignKey('schedules.id', name='fk_attendance_schedule'), nullable=True)
    date = Column(Date, nullable=False, index=True)
    in_time = Column(String(5))  # HH:MM format
    out_time = Column(String(5))  # HH:MM format
    status = Column(String(20))  # onTime, slightlyLate, late, veryLate, missed
    out_status = Column(String(20))
    worked_hours = Column(Float, default=0)
    overtime_hours = Column(Float, default=0)
    break_minutes = Column(Integer, default=0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee")
    schedule = relationship("Schedule", back_populates="attendance")


class Message(Base):
    """Messaging system"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey('users.id', name='fk_message_sender'), nullable=False)
    recipient_id = Column(Integer, ForeignKey('users.id', name='fk_message_recipient'), nullable=True)
    department_id = Column(Integer, ForeignKey('departments.id', name='fk_message_department'), nullable=True)
    subject = Column(String(200))
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    is_deleted_by_sender = Column(Boolean, default=False)
    is_deleted_by_recipient = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    read_at = Column(DateTime)

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")
    department = relationship("Department", back_populates="messages")


class Notification(Base):
    """System notifications"""
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', name='fk_notification_user'), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50))
    related_id = Column(Integer)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications")


class Unavailability(Base):
    """Employee unavailability/constraints"""
    __tablename__ = "unavailability"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id', name='fk_unavail_employee'), nullable=False)
    date = Column(Date, nullable=False, index=True)
    reason = Column(String(100), nullable=True)  # sick, personal, training, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee")


class Shift(Base):
    """Shift/Shift Type model - for detailed shift timing and configuration"""
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey('roles.id', name='fk_shift_role'), nullable=False)
    name = Column(String(100), nullable=False)
    start_time = Column(String(5), nullable=False)  # HH:MM format
    end_time = Column(String(5), nullable=False)  # HH:MM format
    priority = Column(Integer, default=50)
    min_emp = Column(Integer, default=1)  # Minimum employees required
    max_emp = Column(Integer, default=10)  # Maximum employees allowed
    schedule_config = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    role = relationship("Role", back_populates="shifts")


class OvertimeStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class OvertimeTracking(Base):
    """Track monthly overtime for each employee"""
    __tablename__ = "overtime_tracking"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id', name='fk_overtime_employee'), nullable=False)
    month = Column(Integer, nullable=False)  # Month (1-12)
    year = Column(Integer, nullable=False)  # Year
    allocated_hours = Column(Float, default=0)  # Hours allocated/approved for this month
    used_hours = Column(Float, default=0)  # Hours already used
    remaining_hours = Column(Float, default=0)  # Remaining available hours
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = relationship("Employee", back_populates="overtime_tracking")


class OvertimeRequest(Base):
    """Employee overtime requests"""
    __tablename__ = "overtime_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id', name='fk_ot_request_employee'), nullable=False)
    request_date = Column(Date, nullable=False)  # Date of overtime request
    from_time = Column(String(5), nullable=True)  # Start time (HH:MM format)
    to_time = Column(String(5), nullable=True)  # End time (HH:MM format)
    request_hours = Column(Float, nullable=False)  # Hours requested
    reason = Column(Text, nullable=False)  # Reason for overtime
    status = Column(SQLEnum(OvertimeStatus), default=OvertimeStatus.PENDING)
    manager_id = Column(Integer, ForeignKey('users.id', name='fk_ot_request_manager'), nullable=True)
    manager_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = relationship("Employee", back_populates="overtime_requests")
    manager = relationship("User")


class OvertimeWorked(Base):
    """Track actual overtime worked per day"""
    __tablename__ = "overtime_worked"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id', name='fk_ot_worked_employee'), nullable=False)
    work_date = Column(Date, nullable=False, index=True)
    overtime_hours = Column(Float, nullable=False)  # Hours worked over 8 hrs/day
    approval_status = Column(SQLEnum(OvertimeStatus), default=OvertimeStatus.PENDING)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = relationship("Employee", back_populates="overtime_worked")


class CompOffRequest(Base):
    """Comp-off (Compensatory Off) leave requests"""
    __tablename__ = "comp_off_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id', name='fk_compoff_employee'), nullable=False)
    comp_off_date = Column(Date, nullable=False)  # The date for which comp-off is being requested
    reason = Column(Text)  # Reason for taking comp-off
    status = Column(SQLEnum(LeaveStatus), default=LeaveStatus.PENDING)  # pending, approved, rejected
    manager_id = Column(Integer, ForeignKey('managers.id', name='fk_compoff_manager'), nullable=True)
    reviewed_at = Column(DateTime)
    review_notes = Column(Text)
    schedule_id = Column(Integer, ForeignKey('schedules.id', name='fk_compoff_schedule'), nullable=True)  # Schedule created after approval
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = relationship("Employee", back_populates="comp_off_requests")
    manager = relationship("Manager")
    schedule = relationship("Schedule")


class CompOffTracking(Base):
    """Track comp-off balance per employee (earned and used) with monthly expiry"""
    __tablename__ = "comp_off_tracking"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id', name='fk_compoff_tracking_employee'), nullable=False, unique=True)
    earned_days = Column(Integer, default=0)  # Days earned by working on non-shift days
    used_days = Column(Integer, default=0)  # Days already used
    available_days = Column(Integer, default=0)  # Available for use (earned - used)
    earned_date = Column(DateTime, nullable=True)  # When comp-off was earned
    expired_days = Column(Integer, default=0)  # Days expired (not used within month)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = relationship("Employee", back_populates="comp_off_tracking")
    comp_off_details = relationship("CompOffDetail", back_populates="tracking", cascade="all, delete-orphan")


class CompOffDetail(Base):
    """Detailed tracking of each comp-off earned and used"""
    __tablename__ = "comp_off_details"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id', name='fk_compoff_detail_employee'), nullable=False)
    tracking_id = Column(Integer, ForeignKey('comp_off_tracking.id', name='fk_compoff_detail_tracking'), nullable=False)
    type = Column(String(50), default='earned')  # 'earned', 'used', 'expired'
    date = Column(DateTime, default=datetime.utcnow)  # Date earned/used/expired
    earned_month = Column(String(7), default=None)  # Format: "2025-12" for tracking monthly expiry
    expired_at = Column(DateTime, nullable=True)  # When it expired
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tracking = relationship("CompOffTracking", back_populates="comp_off_details")
