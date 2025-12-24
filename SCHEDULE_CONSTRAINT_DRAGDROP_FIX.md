# Schedule Constraint Validation - Drag & Drop Fix

## Problem
When a manager manually drag-and-drops a shift to an employee who already has 5 shifts (making it 6), the system was allowing the save despite violating the 5-day maximum constraint.

## Root Causes Identified & Fixed

### 1. **Incorrect Validation Target** ❌→✅
**Issue**: The validation was checking the OLD employee ID instead of the NEW employee being assigned to.

**Code Before**:
```jsx
const validation = validateScheduleConstraints(
  draggedSchedule.employee_id,  // ❌ OLD employee
  date,
  editedSchedules.filter(s => s.id !== draggedSchedule.id)
);
```

**Code After**:
```jsx
const validation = validateScheduleConstraints(
  emp.id,  // ✅ NEW employee we're assigning to
  date,
  editedSchedules.filter(s => s.id !== draggedSchedule.id)
);
```

### 2. **No Pre-Save Validation** ❌→✅
**Issue**: Even if drag-drop validation was bypassed, the save didn't validate constraints before actually saving to database.

**Solution Added**: In `handleConfirmChanges()`, validate all schedules before saving:
- Check 5-day maximum per employee per week
- Check for duplicate schedules on same day
- Show violation modal if constraints violated
- Block save until constraints are resolved

## Implementation Details

### Frontend Constraint Validation (`ScheduleManager.jsx`)

**1. Drag-Drop Handler** (Line ~560):
```jsx
onDrop={(e) => {
  if (viewMode === 'edit' && draggedSchedule && !onLeave) {
    const validation = validateScheduleConstraints(
      emp.id,  // ✅ Correct: NEW employee
      date,
      editedSchedules.filter(s => s.id !== draggedSchedule.id)
    );
    
    if (!validation.isValid) {
      setViolationMessage(validation.message);
      setViolationDetails(validation.details);
      setShowConstraintViolation(true);
      return;  // Block the drag-drop
    }
    // Only update if valid
    setEditedSchedules(...);
  }
}}
```

**2. Save Confirmation** (Line ~297):
```jsx
const handleConfirmChanges = async () => {
  // Pre-save validation
  for each employee:
    - Count unique days in week
    - If > 5 days: Show violation modal, block save
    - Check for duplicates on same day
  
  // Only proceed if valid
  const allResults = await Promise.all([...tasks]);
}
```

**3. Constraint Violation Modal** (Line ~870):
```jsx
<Modal isOpen={showConstraintViolation} ...>
  <h3>Schedule Constraint Violation</h3>
  <p>{violationMessage}</p>
  <p>{violationDetails}</p>
  <button>Understood</button>
</Modal>
```

## Constraints Enforced

✅ **5-Day Maximum**: No employee can work more than 5 days per week
✅ **No Duplicates**: No employee can have 2 shifts on the same day
✅ **Respects Leaves**: Can't schedule during approved leave or comp-off

## User Experience Flow

### Scenario: Assigning 6th Day to Employee with 5 Days
1. Manager drags shift to employee's 6th day cell
2. **Validation runs** on NEW employee (emp.id)
3. **Finds violation**: 6 days exceeds 5-day limit
4. **Popup shows**: "5-Day Limit Exceeded - Employee is already scheduled for 5 days"
5. **Shift NOT assigned** - drag-drop cancelled
6. Manager can't proceed to "Confirm Changes"

## Testing Checklist

✅ Drag-drop with 5 existing shifts → Shows violation popup
✅ Drag-drop with <5 shifts → Allows assignment
✅ Drag-drop to same day as existing shift → Shows duplicate violation
✅ Click "Confirm Changes" with violations → Blocks save, shows modal
✅ Remove violations → "Confirm Changes" works normally

## Files Modified
- `/home/tw10548/majorv8/frontend/src/components/ScheduleManager.jsx`
  - Fixed drag-drop validation (emp.id instead of draggedSchedule.employee_id)
  - Added pre-save constraint validation
  - Added constraint violation modal
  - Added state management for violation popups

## Status
✅ **COMPLETE** - All drag-drop constraints are now enforced at both drag time and save time.
