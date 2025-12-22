"""
Priority-Based Schedule Generation Service
Uses Google OR-Tools CP-SAT solver with priority-based distribution algorithm

Workflow:
1. Calculate total shifts per role (minus leaves)
2. Distribute by priority percentage to each shift type
3. Distribute across days based on day priorities
4. Assign employees with equal share of shift types
"""

import math
from datetime import datetime, timedelta, date
from collections import defaultdict
from typing import List, Dict, Tuple, Optional, Any
from ortools.sat.python import cp_model


class ShiftScheduleGenerator:
    """Generate optimized schedules using priority-based distribution and OR-Tools"""

    def __init__(self, employees: List[Dict], roles: List[Dict], 
                 leave_dates: Dict[int, set], unavailable_dates: Dict[int, set]):
        """
        Initialize the generator with employees, roles, and blocked dates
        
        Args:
            employees: List of employee dicts with id, name, role_id, shifts_per_week, etc.
            roles: List of role dicts with id, name, priority_percentage, required_count, etc.
            leave_dates: Dict mapping employee_id -> set of leave dates (date objects)
            unavailable_dates: Dict mapping employee_id -> set of unavailable dates
        """
        self.employees = employees
        self.roles = roles
        self.leave_dates = leave_dates
        self.unavailable_dates = unavailable_dates
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.feedback = []

    def add_feedback(self, message: str, severity: str = 'info'):
        """Add feedback message for user visibility"""
        self.feedback.append({'message': message, 'severity': severity})
        print(f"[{severity.upper()}] {message}")

    def _round_allocations(self, raw_allocations: Dict[str, float], 
                          target_total: int) -> Dict[str, int]:
        """
        Round fractional allocations to integers ensuring sum equals target_total.
        Uses the largest remainder method (Hamilton/Hare method).
        
        Args:
            raw_allocations: dict of {key: float_value}
            target_total: int, the exact sum we need
            
        Returns:
            dict of {key: int_value} where sum equals target_total
        """
        # Step 1: Floor all values
        floored = {key: math.floor(value) for key, value in raw_allocations.items()}

        # Step 2: Calculate remainders
        remainders = {key: raw_allocations[key] - floored[key] 
                     for key in raw_allocations}

        # Step 3: Calculate how many units we need to add
        current_sum = sum(floored.values())
        units_to_add = target_total - current_sum

        # Step 4: Sort by remainder (descending) and add 1 to top items
        sorted_by_remainder = sorted(remainders.items(), 
                                    key=lambda x: x[1], reverse=True)

        result = floored.copy()
        for i in range(min(max(0, units_to_add), len(sorted_by_remainder))):
            key = sorted_by_remainder[i][0]
            result[key] += 1

        return result

    def _is_on_leave(self, employee_id: int, check_date: date) -> bool:
        """Check if employee is on leave on given date"""
        return check_date in self.leave_dates.get(employee_id, set())

    def _is_unavailable(self, employee_id: int, check_date: date) -> bool:
        """Check if employee is unavailable on given date"""
        return check_date in self.unavailable_dates.get(employee_id, set())

    def generate(self, start_date: date, end_date: date) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Generate optimized schedule for date range with unavailability reassignment.
        
        When an employee is marked unavailable, they are reassigned to another available day.
        
        Args:
            start_date: Start date for schedule generation
            end_date: End date for schedule generation
            
        Returns:
            Tuple of (schedule_dict, error_message)
            schedule_dict has format: {date: {employee_id: {role_id: [shift_info]}}}
        """
        # Generate date range
        dates = []
        current = start_date
        while current <= end_date:
            dates.append(current)
            current += timedelta(days=1)

        days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 
                       'Friday', 'Saturday', 'Sunday']

        self.add_feedback(f"Generating schedule from {start_date} to {end_date}", 'info')
        self.add_feedback("Note: Unavailable dates will trigger shift reassignment to alternative days", 'info')

        # ===== STEP 1: Calculate total shifts per role (minus leaves AND unavailability) =====
        self.add_feedback("Step 1: Calculating total shifts per role...", 'info')

        role_capacities = {}
        for role in self.roles:
            role_id = role['id']
            role_employees = [e for e in self.employees 
                            if e.get('role_id') == role_id]

            # Sum shifts for all employees in this role
            total_shifts = sum(
                e.get('shifts_per_week', 5) * (len(dates) // 7 + 1)
                for e in role_employees
            )

            # Subtract leave days (hard block - no reassignment)
            leave_reduction = sum(
                sum(1 for d in dates if self._is_on_leave(e['id'], d))
                for e in role_employees
            )

            # Note: Unavailability is handled via reassignment, not capacity reduction
            # The solver will avoid assigning to unavailable days, and reassign instead

            total_shifts = max(0, total_shifts - leave_reduction)
            role_capacities[role_id] = total_shifts

            unavail_count = sum(
                sum(1 for d in dates if self._is_unavailable(e['id'], d))
                for e in role_employees
            )

            self.add_feedback(
                f"  Role '{role['name']}': {total_shifts} shifts needed "
                f"({len(role_employees)} employees, -{leave_reduction} leave days, {unavail_count} unavailable slots)",
                'info'
            )

        # ===== STEP 2 & 3: Distribute by priority to days =====
        self.add_feedback("Step 2: Distributing shifts by priority...", 'info')

        day_role_allocations = {}  # {date: {role_id: count}}
        
        for date_obj in dates:
            day_name = date_obj.strftime('%A')
            day_role_allocations[date_obj] = {}

            for role in self.roles:
                role_id = role['id']
                capacity = role_capacities.get(role_id, 0)
                
                if capacity == 0:
                    day_role_allocations[date_obj][role_id] = 0
                    continue

                # Check if role is configured for this day
                schedule_config = role.get('schedule_config', {})
                day_config = schedule_config.get(day_name, {})
                
                if not day_config.get('enabled', False):
                    day_role_allocations[date_obj][role_id] = 0
                    continue

                # Get day priority
                day_priority = day_config.get('day_priority', 1)
                
                # Calculate required count for this role on this day
                required_count = day_config.get('required_count', 
                                               role.get('required_count', 1))
                
                # Count available employees for this role on this date
                # Only exclude leaves, NOT unavailability (unavailable employees can be reassigned)
                available_count = sum(
                    1 for e in self.employees
                    if e.get('role_id') == role_id and
                    not self._is_on_leave(e['id'], date_obj)
                )

                # Also exclude employees who cannot work this day due to shift type schedule
                role_emp_can_work = sum(
                    1 for e in self.employees
                    if e.get('role_id') == role_id and
                    not self._is_on_leave(e['id'], date_obj) and
                    self._can_work_role_on_day(e['id'], role_id, day_name)
                )

                # Allocation is minimum of required and available
                allocation = min(required_count, role_emp_can_work) if role_emp_can_work > 0 else 0
                day_role_allocations[date_obj][role_id] = allocation

                self.add_feedback(
                    f"  {date_obj} ({day_name}) - Role '{role['name']}': "
                    f"{allocation} shifts (required: {required_count}, available: {role_emp_can_work})",
                    'info'
                )

        # ===== STEP 4: Create decision variables =====
        self.add_feedback("Step 3: Creating assignment variables...", 'info')

        # assignments[emp_id][date][role_id] = BoolVar
        assignments = {}
        
        for emp in self.employees:
            emp_id = emp['id']
            assignments[emp_id] = {}

            for date_obj in dates:
                assignments[emp_id][date_obj] = {}
                day_name = date_obj.strftime('%A')

                # Skip if employee is on LEAVE (hard block)
                if self._is_on_leave(emp_id, date_obj):
                    continue

                # For unavailability: still create variable, but strongly discourage it
                # We'll use a soft constraint that prefers other days

                # Create variable for each role employee can work
                role_id = emp.get('role_id')
                if role_id:
                    schedule_config = next(
                        (r.get('schedule_config', {}) for r in self.roles 
                         if r['id'] == role_id),
                        {}
                    )
                    day_config = schedule_config.get(day_name, {})

                    if day_config.get('enabled', False):
                        var = self.model.NewBoolVar(
                            f'assign_e{emp_id}_d{date_obj}_r{role_id}'
                        )
                        assignments[emp_id][date_obj][role_id] = var

        # ===== CONSTRAINTS =====
        self.add_feedback("Step 4: Adding constraints...", 'info')

        # Constraint 1: Each role must have required employees per day
        for date_obj in dates:
            for role in self.roles:
                role_id = role['id']
                required = day_role_allocations[date_obj].get(role_id, 0)

                if required > 0:
                    day_assignments = []
                    for emp in self.employees:
                        if (emp.get('role_id') == role_id and
                            date_obj in assignments.get(emp['id'], {})):
                            if role_id in assignments[emp['id']][date_obj]:
                                day_assignments.append(
                                    assignments[emp['id']][date_obj][role_id]
                                )

                    if day_assignments:
                        self.model.Add(sum(day_assignments) >= required)

        # Constraint 2: One shift per day maximum per employee
        for emp in self.employees:
            for date_obj in dates:
                day_shifts = list(assignments.get(emp['id'], {}).get(date_obj, {}).values())
                if len(day_shifts) > 1:
                    self.model.Add(sum(day_shifts) <= 1)

        # Constraint 3: Employees work assigned shifts per week
        self.add_feedback("Step 5: Applying shift distribution constraints...", 'info')

        for emp in self.employees:
            emp_id = emp['id']
            shifts_per_week = emp.get('shifts_per_week', 5)

            # Count available days (not on leave)
            available_days = sum(
                1 for d in dates
                if not self._is_on_leave(emp_id, d)
            )

            # Target shifts (proportional to available days)
            weeks_count = len(dates) / 7.0
            target_shifts = int(shifts_per_week * weeks_count)

            if target_shifts > 0 and available_days > 0:
                emp_shifts = []
                for date_obj in dates:
                    for role_id in assignments.get(emp_id, {}).get(date_obj, {}):
                        emp_shifts.append(
                            assignments[emp_id][date_obj][role_id]
                        )

                if emp_shifts:
                    self.model.Add(sum(emp_shifts) <= target_shifts)
                    self.add_feedback(
                        f"  {emp['name']}: max {target_shifts} shifts "
                        f"({available_days} available days)",
                        'info'
                    )

        # Constraint 4: No more than 5 consecutive shifts
        self.add_feedback("Step 6: Applying consecutive shift limits...", 'info')

        for emp in self.employees:
            emp_id = emp['id']
            # For each 6-day window, ensure no more than 5 shifts
            for i in range(len(dates) - 5):
                window_dates = dates[i:i+6]
                window_shifts = []
                
                for date_obj in window_dates:
                    for role_id in assignments.get(emp_id, {}).get(date_obj, {}):
                        window_shifts.append(
                            assignments[emp_id][date_obj][role_id]
                        )

                if window_shifts:
                    self.model.Add(sum(window_shifts) <= 5)

        # Objective: Maximize coverage + prefer non-unavailable days
        self.add_feedback("Step 7: Setting optimization objective...", 'info')

        objective_terms = []
        for emp_id in assignments:
            for date_obj in assignments[emp_id]:
                for role_id in assignments[emp_id][date_obj]:
                    var = assignments[emp_id][date_obj][role_id]
                    # Base score for assignment
                    objective_terms.append(var)
                    
                    # Bonus if NOT on unavailable day (prefers available days)
                    if not self._is_unavailable(emp_id, date_obj):
                        objective_terms.append(var)  # Extra weight for available days

        if objective_terms:
            self.model.Maximize(sum(objective_terms))

        # ===== SOLVE =====
        self.add_feedback("Step 8: Solving with OR-Tools CP-SAT...", 'info')

        self.solver.parameters.max_time_in_seconds = 90.0
        self.solver.parameters.num_search_workers = 8
        self.solver.parameters.log_search_progress = False

        status = self.solver.Solve(self.model)

        if status not in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            error_msg = "Could not generate feasible schedule. Try adjusting constraints."
            self.add_feedback(error_msg, 'error')
            return None, error_msg

        self.add_feedback("✅ Schedule generated successfully!", 'success')

        # ===== EXTRACT SOLUTION =====
        schedule = defaultdict(lambda: defaultdict(dict))

        for emp in self.employees:
            emp_id = emp['id']
            for date_obj in dates:
                for role_id in assignments.get(emp_id, {}).get(date_obj, {}):
                    var = assignments[emp_id][date_obj][role_id]
                    if self.solver.Value(var) == 1:
                        role = next((r for r in self.roles if r['id'] == role_id), None)
                        if role:
                            schedule[date_obj][emp_id] = {
                                'role_id': role_id,
                                'role_name': role['name'],
                                'start_time': role.get('start_time', '09:00'),
                                'end_time': role.get('end_time', '17:00'),
                            }

        return dict(schedule), None

    def _can_work_role_on_day(self, emp_id: int, role_id: int, day_name: str) -> bool:
        """Check if employee can work a specific role on a specific day"""
        role = next((r for r in self.roles if r['id'] == role_id), None)
        if not role:
            return False
        
        schedule_config = role.get('schedule_config', {})
        day_config = schedule_config.get(day_name, {})
        return day_config.get('enabled', False)
