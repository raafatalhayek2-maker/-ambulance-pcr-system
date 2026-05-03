# V2 Operations Module — Employees, Time Clock, Payroll

> DEMO ONLY. This module is for product demonstration. It is not a real payroll, HR, compliance, HIPAA, or employment-law system.

## What was added

### Database
Run this file in Supabase SQL Editor after the original V1 setup:

```sql
supabase/migrations/0002_employee_time_clock_payroll.sql
```

It adds:

- `employees`
- `time_entries`
- one-open-shift guard so one employee cannot clock in twice at the same time
- demo employee seed rows based on the existing demo users

### API routes

- `GET /api/employees` — list employees
- `POST /api/employees` — add employee
- `GET /api/time-clock` — list recent time entries
- `POST /api/time-clock` — clock in / clock out
- `GET /api/payroll` — calculate demo payroll summary from completed shifts

### App pages

- `/operations` — operations landing page
- `/employees` — add/list staff profiles
- `/time-clock` — employee clock-in/out with live timer
- `/payroll` — weekly hours and estimated gross pay

## How to test

1. Deploy or run the app.
2. Make sure Supabase V1 setup is already done.
3. Paste and run `supabase/migrations/0002_employee_time_clock_payroll.sql` in Supabase SQL Editor.
4. Login with a demo account:
   - `emt1 / demo123`
   - `emt2 / demo123`
   - `sup1 / demo123`
5. Open `/operations`.
6. Add employees or use the seeded demo employees.
7. Go to `/time-clock`, choose an employee, and tap **Clock In**.
8. Watch the live timer.
9. Tap **Clock Out**.
10. Go to `/payroll` and run the payroll summary.

## Important limitations before production

Before real company use, this needs:

- real authentication and role permissions
- encrypted secrets and stricter server-side authorization
- payroll compliance rules
- overtime rules
- edit/approve time entries
- audit logs for payroll edits
- employee document storage
- HIPAA/security review if combined with patient data
- production database backups

## Suggested next build items

1. Employee edit page.
2. Delete/deactivate employee button.
3. Supervisor approval for time entries.
4. Overtime calculation.
5. Export payroll CSV.
6. Admin-only access control.
7. Connect time entries to ambulance shifts or trips.
