# Quick Reference - Admin Department View Toggle

## What Works Now?

When you click a department in Admin Dashboard:

### View 1: All Employees (Default)
```
Shows ALL employees in the department
├─ Employee ID
├─ Full Name
├─ Email
└─ Status (Present, Scheduled, Not Scheduled)
```

### View 2: Today's Attendance
```
Shows ONLY today's attendance records
├─ Employee details
├─ Check-in/out times
├─ Hours worked
├─ Overtime hours
└─ Attendance status
```

## How to Use

1. **Open Admin → Department Management**
2. **Click any Department**
3. **See All Employees by default**
4. **Click "Today's Attendance" button to see:**
   - Present count
   - Late count
   - Absent count
   - Detailed attendance table
5. **Click "All Employees" to go back**

## Buttons

```
┌─────────────────────────────────────────────────┐
│ Employees (10)  [All Employees] [Today's Att.]  │
└─────────────────────────────────────────────────┘

Blue button = Active view (All Employees)
Green button = Active view (Today's Attendance)
Gray button = Inactive view
```

## Views Side by Side

### All Employees View
```
Employee ID │ Name        │ Email          │ Status
EMP001      │ John Smith  │ john@...       │ Present
EMP002      │ Jane Doe    │ jane@...       │ Present
EMP003      │ Bob Wilson  │ bob@...        │ Not Scheduled
EMP004      │ Alice Brown │ alice@...      │ Scheduled
...
```

### Today's Attendance View
```
Shows:
- Present: 8 ✓
- Late: 1 ⚠️
- Absent: 1 ✗

Plus detailed table:
Name   │ Role │ Shift │ Check-In │ Check-Out │ Hours │ OT
John   │ Dev  │ 9-5   │ 09:00    │ 18:00     │ 8.00  │ 0
Jane   │ QA   │ 9-5   │ 09:15    │ 18:30     │ 8.25  │ 0.25
Bob    │ Dev  │ 9-5   │ -        │ -         │ -     │ -
...
```

## Count Updates

The count in the header changes based on view:

```
All Employees View:
├─ Employees (10) ← Shows total employees

Today's Attendance View:
└─ Employees (8)  ← Shows only those with attendance today
```

## Color Coding

| Element | Color | Meaning |
|---------|-------|---------|
| Active button | Blue/Green | Current view |
| Inactive button | Gray | Other view |
| "Present" status | Green badge | Checked in on time |
| "Scheduled" status | Gray badge | Scheduled but no attendance |
| "Not Scheduled" status | Gray badge | Not assigned today |

## Mobile Friendly

Buttons stack nicely on mobile:
```
[All Employees]
[Today's Attendance]
```

## No Reloads Needed

- Switching views is instant
- No API calls when toggling
- All data is pre-loaded
- Just a client-side view switch

## When Does View Reset?

- ✅ When you click a different department
- ✅ When you reload the page
- ✅ View always starts on "All Employees"

## What Data Is Used?

| View | Data Source | Availability |
|------|-------------|--------------|
| All Employees | Department details | Always available |
| Today's Attendance | Attendance API | Only if scheduled today |

## Performance

- ⚡ Instant toggle between views
- 📊 No extra API calls
- 💾 All data cached in state
- 🚀 Smooth animations

---

**Status**: Ready to Use! ✅
