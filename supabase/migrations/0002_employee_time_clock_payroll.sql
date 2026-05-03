-- PCR Pilot V2 — Employee time clock and payroll demo module
-- DEMO ONLY. Not payroll/legal/compliance advice. Do not use with real patient data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS employees (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  full_name    text NOT NULL,
  role         text NOT NULL DEFAULT 'Driver'
                 CHECK (role IN ('EMT','Driver','Supervisor','Admin')),
  phone        text,
  email        text,
  hourly_rate  numeric(10,2) NOT NULL DEFAULT 0,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

CREATE TABLE IF NOT EXISTS time_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  clock_in_at    timestamptz NOT NULL DEFAULT now(),
  clock_out_at   timestamptz,
  break_minutes  integer NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
  shift_role     text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (clock_out_at IS NULL OR clock_out_at >= clock_in_at)
);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in_at ON time_entries(clock_in_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_entries_one_open_shift
  ON time_entries(employee_id)
  WHERE clock_out_at IS NULL;

DROP TRIGGER IF EXISTS employees_touch_updated_at ON employees;
CREATE TRIGGER employees_touch_updated_at BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS time_entries_touch_updated_at ON time_entries;
CREATE TRIGGER time_entries_touch_updated_at BEFORE UPDATE ON time_entries
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Seed demo employee profiles from existing demo users, if present.
INSERT INTO employees (user_id, full_name, role, hourly_rate, active)
SELECT id,
       full_name,
       CASE WHEN role = 'supervisor' THEN 'Supervisor' ELSE 'EMT' END,
       CASE WHEN role = 'supervisor' THEN 32.00 ELSE 24.00 END,
       true
FROM users
ON CONFLICT DO NOTHING;
