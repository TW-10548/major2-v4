from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import date, datetime
from app.models import UserType, LeaveStatus


# Unavailability schemas
class UnavailabilityCreate(BaseModel):
    employee_id: int
    date: date
    reason: Optional[str] = None


class UnavailabilityResponse(BaseModel):
    id: int
    employee_id: int
    date: date
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Shift schemas (for shift type/shift timing configuration)
class ShiftCreate(BaseModel):
    role_id: int
    name: str
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    priority: int = 50
    min_emp: int = 1
    max_emp: int = 10
    schedule_config: dict = {}


class ShiftUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    priority: Optional[int] = None
    min_emp: Optional[int] = None
    max_emp: Optional[int] = None
    schedule_config: Optional[dict] = None


class ShiftResponse(BaseModel):
    id: int
    role_id: int
    name: str
    start_time: str
    end_time: str
    priority: int
    min_emp: int
    max_emp: int
    schedule_config: dict
    is_active: bool

    class Config:
        from_attributes = True


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


class TokenData(BaseModel):
    username: Optional[str] = None


# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    user_type: UserType


class UserCreate(UserBase):
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    user_type: UserType
    is_active: bool
    manager_department_id: Optional[int] = None

    class Config:
        from_attributes = True


# Department schemas
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    dept_id: Optional[str] = None


class DepartmentResponse(BaseModel):
    id: int
    dept_id: str
    name: str
    description: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class EmployeeAttendanceResponse(BaseModel):
    id: int
    employee_id: str
    first_name: str
    last_name: str
    email: str
    assigned_shift_time: Optional[str] = None
    total_hrs_assigned: Optional[str] = None
    latest_check_in: Optional[datetime] = None
    latest_check_out: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class DepartmentDetailResponse(BaseModel):
    id: int
    dept_id: str
    name: str
    description: Optional[str]
    manager: Optional[Dict] = None
    employees: List[EmployeeAttendanceResponse] = []
    
    class Config:
        from_attributes = True


# Manager schemas
class ManagerCreate(BaseModel):
    user_id: int
    department_id: int


class ManagerResponse(BaseModel):
    id: int
    manager_id: str
    user_id: int
    department_id: int
    is_active: bool

    class Config:
        from_attributes = True


class ManagerDetailResponse(BaseModel):
    id: int
    manager_id: str
    user_id: int
    username: str
    full_name: str
    email: str
    department_id: int
    is_active: bool

    class Config:
        from_attributes = True


# Employee schemas
class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    department_id: int
    role_id: Optional[int] = None
    employment_type: str = 'full_time'  # 'full_time' or 'part_time'
    weekly_hours: float = 40
    daily_max_hours: float = 8
    shifts_per_week: int = 5
    paid_leave_per_year: int = 10
    skills: List[str] = []


class EmployeeCreate(EmployeeBase):
    hire_date: Optional[date] = None
    password: Optional[str] = None  # Optional password for user account creation


class EmployeeResponse(BaseModel):
    id: int
    employee_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    address: Optional[str]
    department_id: int
    role_id: Optional[int]
    user_id: Optional[int]
    employment_type: str
    weekly_hours: float
    daily_max_hours: float
    shifts_per_week: int
    paid_leave_per_year: int
    skills: List[str]
    is_active: bool

    class Config:
        from_attributes = True


# Role schemas
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    department_id: int
    priority: int = 50
    priority_percentage: int = 50
    required_skills: List[str] = []
    break_minutes: int = 60
    weekend_required: bool = False
    schedule_config: dict = {}


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    priority_percentage: Optional[int] = None
    required_skills: Optional[List[str]] = None
    break_minutes: Optional[int] = None
    weekend_required: Optional[bool] = None
    schedule_config: Optional[dict] = None


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    department_id: int
    priority: int
    priority_percentage: int
    required_skills: List[str]
    break_minutes: int
    weekend_required: bool
    schedule_config: dict
    is_active: bool

    class Config:
        from_attributes = True


class RoleDetailResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    department_id: int
    priority: int
    priority_percentage: int
    required_skills: List[str]
    break_minutes: int
    weekend_required: bool
    schedule_config: dict
    is_active: bool
    shifts: List['ShiftResponse'] = []

    class Config:
        from_attributes = True


# Leave Request schemas
class LeaveRequestBase(BaseModel):
    employee_id: int
    start_date: date
    end_date: date
    leave_type: str
    duration_type: Optional[str] = 'full_day'  # full_day, half_day_morning, half_day_afternoon
    reason: Optional[str] = None


class LeaveRequestCreate(LeaveRequestBase):
    pass


class LeaveRequestResponse(BaseModel):
    id: int
    employee_id: int
    start_date: date
    end_date: date
    leave_type: str
    duration_type: Optional[str] = 'full_day'
    reason: Optional[str]
    status: LeaveStatus
    manager_id: Optional[int]
    reviewed_at: Optional[datetime]
    review_notes: Optional[str]
    created_at: datetime
    employee: Optional['EmployeeResponse'] = None

    class Config:
        from_attributes = True


class LeaveApproval(BaseModel):
    review_notes: Optional[str] = None


# Message schemas
class MessageBase(BaseModel):
    subject: Optional[str] = None
    message: str
    recipient_id: Optional[int] = None
    department_id: Optional[int] = None


class MessageCreate(MessageBase):
    pass


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    recipient_id: Optional[int]
    department_id: Optional[int]
    subject: Optional[str]
    message: str
    is_read: bool
    created_at: datetime
    sender: Optional['UserResponse'] = None
    recipient: Optional['UserResponse'] = None

    class Config:
        from_attributes = True


# Check-In schemas
class CheckInCreate(BaseModel):
    location: Optional[str] = None


class CheckOutCreate(BaseModel):
    notes: Optional[str] = None


class CheckInResponse(BaseModel):
    id: int
    employee_id: int
    schedule_id: Optional[int]
    date: date
    check_in_time: Optional[datetime]
    check_out_time: Optional[datetime]
    check_in_status: Optional[str]
    employee: Optional['EmployeeResponse'] = None
    schedule: Optional['ScheduleResponse'] = None

    class Config:
        from_attributes = True


# Schedule schemas
class ScheduleCreate(BaseModel):
    employee_id: int
    role_id: int
    date: date
    start_time: str
    end_time: str
    shift_id: Optional[int] = None  # Optional - if None, it's a custom schedule
    notes: Optional[str] = None


class ScheduleUpdate(BaseModel):
    employee_id: Optional[int] = None
    role_id: Optional[int] = None
    date: Optional[str] = None  # Accept string, will be converted
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    shift_id: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        # Allow coercion of data types
        str_strip_whitespace = True


class ScheduleResponse(BaseModel):
    id: int
    department_id: int
    employee_id: int
    role_id: int
    shift_id: Optional[int]  # Optional shift assignment
    date: date
    start_time: Optional[str]
    end_time: Optional[str]
    status: str
    notes: Optional[str]
    role: Optional['RoleResponse'] = None

    class Config:
        from_attributes = True


# Dashboard schemas
class EmployeeDashboard(BaseModel):
    todays_schedule: Optional[ScheduleResponse]
    weekly_stats: dict
    upcoming_shifts: List[ScheduleResponse]
    check_in_status: Optional[CheckInResponse]


class ManagerDashboard(BaseModel):
    department_stats: dict
    pending_leaves_count: int
    recent_activity: List[dict]
    todays_attendance: List[dict]


class AdminDashboard(BaseModel):
    system_stats: dict
    department_summary: List[dict]
    recent_activity: List[dict]


# Notification schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    notification_type: Optional[str]
    related_id: Optional[int]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: str
    notification_type: Optional[str] = None
    related_id: Optional[int] = None

# Attendance schemas
class AttendanceCreate(BaseModel):
    schedule_id: Optional[int] = None
    in_time: str  # HH:MM format
    out_time: Optional[str] = None
    status: str
    notes: Optional[str] = None


class AttendanceUpdate(BaseModel):
    out_time: Optional[str] = None
    out_status: Optional[str] = None
    overtime_hours: Optional[float] = None
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    schedule_id: Optional[int]
    date: date
    in_time: Optional[str]
    out_time: Optional[str]
    status: Optional[str]
    out_status: Optional[str]
    worked_hours: float
    overtime_hours: float
    break_minutes: int
    notes: Optional[str]
    created_at: datetime
    employee: Optional['EmployeeResponse'] = None
    schedule: Optional['ScheduleResponse'] = None

    class Config:
        from_attributes = True


# Schedule Generation schemas
class ScheduleGenerationRequest(BaseModel):
    department_id: int
    week_start_date: date
    week_end_date: date


class ScheduleGenerationResponse(BaseModel):
    success: bool
    schedule: Optional[Dict] = None
    feedback: List[Dict] = []
    error: Optional[str] = None


# Shift Request (for employee shift swap requests)
class ShiftRequestCreate(BaseModel):
    from_employee_id: int
    to_employee_id: int
    date: date
    reason: Optional[str] = None


class ShiftRequestResponse(BaseModel):
    id: int
    from_employee_id: int
    to_employee_id: int
    date: date
    reason: Optional[str]
    status: str  # pending, approved, rejected
    created_at: datetime

    class Config:
        from_attributes = True


# Overtime Schemas
class OvertimeTrackingResponse(BaseModel):
    id: int
    employee_id: int
    month: int
    year: int
    allocated_hours: float
    used_hours: float
    remaining_hours: float

    class Config:
        from_attributes = True


class OvertimeRequestCreate(BaseModel):
    request_date: date
    from_time: str
    to_time: str
    request_hours: float
    reason: str


class OvertimeRequestResponse(BaseModel):
    id: int
    employee_id: int
    request_date: date
    from_time: Optional[str] = None
    to_time: Optional[str] = None
    request_hours: float
    reason: str
    status: str
    manager_notes: Optional[str] = None
    created_at: datetime
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OvertimeWorkedResponse(BaseModel):
    id: int
    employee_id: int
    work_date: date
    overtime_hours: float
    approval_status: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# Comp-Off Schemas
class CompOffRequestBase(BaseModel):
    employee_id: Optional[int] = None
    comp_off_date: date
    reason: Optional[str] = None


class CompOffRequestCreate(CompOffRequestBase):
    pass


class CompOffRequestResponse(BaseModel):
    id: int
    employee_id: int
    comp_off_date: date
    reason: Optional[str]
    status: LeaveStatus
    manager_id: Optional[int]
    reviewed_at: Optional[datetime]
    review_notes: Optional[str]
    schedule_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    employee: Optional['EmployeeResponse'] = None

    class Config:
        from_attributes = True


class CompOffTrackingResponse(BaseModel):
    id: int
    employee_id: int
    earned_days: int
    used_days: int
    available_days: int
    expired_days: int = 0
    earned_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompOffDetailResponse(BaseModel):
    id: int
    employee_id: int
    tracking_id: int
    type: str  # 'earned', 'used', 'expired'
    date: datetime
    earned_month: Optional[str] = None  # "2025-12" format
    expired_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CompOffMonthlyBreakdown(BaseModel):
    month: str  # "2025-12" format
    earned: int
    used: int
    available: int
    expired: int
    expiry_date: date
    details: List[CompOffDetailResponse] = []


class CompOffStatisticsResponse(BaseModel):
    total_earned: int
    total_used: int
    total_available: int
    total_expired: int
    current_month: str
    by_month: List[CompOffMonthlyBreakdown] = []

    class Config:
        from_attributes = True


# Update forward references for circular dependencies
CheckInResponse.model_rebuild()
ScheduleResponse.model_rebuild()
MessageResponse.model_rebuild()
