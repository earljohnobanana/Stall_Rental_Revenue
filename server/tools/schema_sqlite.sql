-- ============================================================================
-- stall_rental_db — SQLite schema
-- Converted from the live MariaDB dump (phpMyAdmin, 2026-07-02).
-- Mirrors every table, unique key, index, and foreign key from MySQL.
--
-- Conversion notes:
--   * AUTO_INCREMENT      -> INTEGER PRIMARY KEY AUTOINCREMENT
--   * ENUM(...)           -> TEXT + CHECK constraint (same allowed values)
--   * DECIMAL             -> NUMERIC (SQLite stores exact text/real as given)
--   * ON UPDATE current_timestamp() -> triggers (SQLite has no column ON UPDATE)
--   * All FKs preserved with the same ON DELETE / ON UPDATE behavior
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
CREATE TABLE staff_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id   TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff'
                CHECK (role IN ('admin','cashier','staff')),
  department    TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------------
CREATE TABLE buildings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------------
CREATE TABLE stall_categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------------
CREATE TABLE stalls (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  stall_number     TEXT NOT NULL,
  building_id      INTEGER NOT NULL,
  category_id      INTEGER,
  rental_rate      NUMERIC NOT NULL DEFAULT 0.00,
  security_deposit NUMERIC NOT NULL DEFAULT 0.00,
  electric_fee     NUMERIC NOT NULL DEFAULT 0.00,
  status           TEXT NOT NULL DEFAULT 'vacant'
                   CHECK (status IN ('occupied','vacant','delinquent')),
  date_started     TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (stall_number, building_id),
  FOREIGN KEY (building_id) REFERENCES buildings(id) ON UPDATE CASCADE,
  FOREIGN KEY (category_id) REFERENCES stall_categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX idx_stalls_building ON stalls(building_id);
CREATE INDEX idx_stalls_category ON stalls(category_id);

-- ---------------------------------------------------------------------------
-- NOTE: status CHECK allows '' because live data contains legacy rows with
-- empty status (migrated as-is). New rows should use the three real values.
CREATE TABLE stall_owners (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name        TEXT NOT NULL,
  contact_number   TEXT,
  address          TEXT,
  stall_id         INTEGER,
  rental_rate      NUMERIC NOT NULL DEFAULT 0.00,
  security_deposit NUMERIC NOT NULL DEFAULT 0.00,
  date_started     TEXT,
  status           TEXT NOT NULL DEFAULT 'occupied'
                   CHECK (status IN ('occupied','vacant','delinquent','')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (stall_id),
  FOREIGN KEY (stall_id) REFERENCES stalls(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------------
CREATE TABLE owners (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_name     TEXT NOT NULL,
  contact_number TEXT,
  address        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------------
CREATE TABLE stall_history (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  stall_id         INTEGER NOT NULL,
  stall_number     TEXT NOT NULL,
  owner_name       TEXT NOT NULL,
  contact_number   TEXT,
  address          TEXT,
  rental_rate      NUMERIC DEFAULT 0.00,
  security_deposit NUMERIC DEFAULT 0.00,
  date_started     TEXT,
  date_ended       TEXT NOT NULL,
  remarks          TEXT,
  recorded_by      INTEGER,
  created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (stall_id) REFERENCES stalls(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_history_stall ON stall_history(stall_id);

-- ---------------------------------------------------------------------------
CREATE TABLE payments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id       INTEGER,
  history_id     INTEGER,
  stall_id       INTEGER,
  or_number      TEXT NOT NULL,
  payment_type   TEXT NOT NULL DEFAULT 'monthly'
                 CHECK (payment_type IN
                   ('security_deposit','monthly','electric','rental')),
  control_number TEXT,
  payment_date   TEXT NOT NULL,
  rental_fee     NUMERIC NOT NULL DEFAULT 0.00,
  electric_fee   NUMERIC NOT NULL DEFAULT 0.00,
  total_amount   NUMERIC NOT NULL DEFAULT 0.00,
  remarks        TEXT,
  recorded_by    INTEGER,
  created_at     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (owner_id)    REFERENCES stall_owners(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES staff_users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (stall_id)    REFERENCES stalls(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX idx_payment_date  ON payments(payment_date);
CREATE INDEX idx_payment_owner ON payments(owner_id);
CREATE INDEX idx_payment_stall ON payments(stall_id);
CREATE INDEX idx_payment_recorded_by ON payments(recorded_by);

-- ---------------------------------------------------------------------------
CREATE TABLE payment_balances (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id            INTEGER NOT NULL,
  month               INTEGER NOT NULL,
  year                INTEGER NOT NULL,
  amount_due          NUMERIC NOT NULL DEFAULT 0.00,
  amount_paid         NUMERIC NOT NULL DEFAULT 0.00,
  rental_balance      NUMERIC NOT NULL DEFAULT 0.00,
  electric_balance    NUMERIC NOT NULL DEFAULT 0.00,
  balance             NUMERIC NOT NULL DEFAULT 0.00,
  interest_rate       NUMERIC NOT NULL DEFAULT 25.00,
  interest_amount     NUMERIC NOT NULL DEFAULT 0.00,
  total_with_interest NUMERIC NOT NULL DEFAULT 0.00,
  is_settled          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (owner_id, month, year),
  FOREIGN KEY (owner_id) REFERENCES stall_owners(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------------
CREATE TABLE electric_fees (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  stall_id     INTEGER NOT NULL,
  year         INTEGER NOT NULL,
  month        INTEGER NOT NULL,
  reading_prev NUMERIC DEFAULT 0.00,
  reading_curr NUMERIC DEFAULT 0.00,
  consumption  NUMERIC DEFAULT 0.00,
  rate_per_kwh NUMERIC DEFAULT 0.0000,
  amount_due   NUMERIC DEFAULT 0.00,
  is_paid      INTEGER DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (stall_id, year, month),
  FOREIGN KEY (stall_id) REFERENCES stalls(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------------
CREATE TABLE night_market_stalls (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  stall_number     TEXT NOT NULL UNIQUE,
  owner_name       TEXT NOT NULL,
  contact_number   TEXT,
  address          TEXT,
  rental_rate      NUMERIC NOT NULL DEFAULT 0.00,
  security_deposit NUMERIC NOT NULL DEFAULT 0.00,
  has_interest     INTEGER NOT NULL DEFAULT 0,
  interest_rate    NUMERIC NOT NULL DEFAULT 25.00,
  status           TEXT NOT NULL DEFAULT 'occupied'
                   CHECK (status IN ('occupied','vacant','delinquent')),
  date_started     TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------------------
CREATE TABLE night_market_payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  stall_id     INTEGER NOT NULL,
  or_number    TEXT NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'daily'
               CHECK (payment_type IN
                 ('security_deposit','monthly','daily','electric')),
  payment_date TEXT NOT NULL,
  rental_fee   NUMERIC NOT NULL DEFAULT 0.00,
  electric_fee NUMERIC NOT NULL DEFAULT 0.00,
  balance      NUMERIC NOT NULL DEFAULT 0.00,
  interest     NUMERIC NOT NULL DEFAULT 0.00,
  total_amount NUMERIC NOT NULL DEFAULT 0.00,
  remarks      TEXT,
  recorded_by  INTEGER,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (stall_id) REFERENCES night_market_stalls(id) ON UPDATE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES staff_users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX idx_nmp_stall ON night_market_payments(stall_id);
CREATE INDEX idx_nmp_recorded_by ON night_market_payments(recorded_by);

-- ---------------------------------------------------------------------------
CREATE TABLE activity_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,
  action      TEXT NOT NULL,
  table_name  TEXT,
  record_id   INTEGER,
  description TEXT,
  ip_address  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES staff_users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX idx_log_created ON activity_logs(created_at);
CREATE INDEX idx_log_user    ON activity_logs(user_id);

-- ===========================================================================
-- Triggers replacing MySQL's ON UPDATE current_timestamp()
-- ===========================================================================
CREATE TRIGGER trg_staff_users_updated AFTER UPDATE ON staff_users
BEGIN UPDATE staff_users SET updated_at = datetime('now','localtime') WHERE id = NEW.id; END;

CREATE TRIGGER trg_buildings_updated AFTER UPDATE ON buildings
BEGIN UPDATE buildings SET updated_at = datetime('now','localtime') WHERE id = NEW.id; END;

CREATE TRIGGER trg_stalls_updated AFTER UPDATE ON stalls
BEGIN UPDATE stalls SET updated_at = datetime('now','localtime') WHERE id = NEW.id; END;

CREATE TRIGGER trg_stall_owners_updated AFTER UPDATE ON stall_owners
BEGIN UPDATE stall_owners SET updated_at = datetime('now','localtime') WHERE id = NEW.id; END;

CREATE TRIGGER trg_payments_updated AFTER UPDATE ON payments
BEGIN UPDATE payments SET updated_at = datetime('now','localtime') WHERE id = NEW.id; END;

CREATE TRIGGER trg_payment_balances_updated AFTER UPDATE ON payment_balances
BEGIN UPDATE payment_balances SET updated_at = datetime('now','localtime') WHERE id = NEW.id; END;

CREATE TRIGGER trg_nm_stalls_updated AFTER UPDATE ON night_market_stalls
BEGIN UPDATE night_market_stalls SET updated_at = datetime('now','localtime') WHERE id = NEW.id; END;