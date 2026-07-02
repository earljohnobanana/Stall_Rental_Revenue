USE stall_rental_db;

-- ─── Drop existing tables in correct FK order ─────────────────
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS electric_fees;
DROP TABLE IF EXISTS stall_owners;
DROP TABLE IF EXISTS stalls;
DROP TABLE IF EXISTS stall_categories;
DROP TABLE IF EXISTS buildings;
DROP TABLE IF EXISTS staff_users;
SET FOREIGN_KEY_CHECKS = 1;

-- ─── 1. Staff Users ───────────────────────────────────────────
CREATE TABLE staff_users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id   VARCHAR(50)  NOT NULL UNIQUE,
  full_name     VARCHAR(150) NOT NULL,
  role          ENUM('admin','cashier','staff') NOT NULL DEFAULT 'staff',
  department    VARCHAR(100) DEFAULT NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 2. Buildings ─────────────────────────────────────────────
CREATE TABLE buildings (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  description   TEXT         DEFAULT NULL,
  location      VARCHAR(200) DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 3. Stall Categories ──────────────────────────────────────
CREATE TABLE stall_categories (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 4. Stalls ────────────────────────────────────────────────
CREATE TABLE stalls (
  id                INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  stall_number      VARCHAR(30)    NOT NULL,
  building_id       INT UNSIGNED   NOT NULL,
  category_id       INT UNSIGNED   DEFAULT NULL,
  rental_rate       DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  security_deposit  DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  electric_fee      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  status            ENUM('occupied','vacant','delinquent') NOT NULL DEFAULT 'vacant',
  date_started      DATE           DEFAULT NULL,
  created_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stall_number_building (stall_number, building_id),
  FOREIGN KEY (building_id) REFERENCES buildings(id)        ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (category_id) REFERENCES stall_categories(id) ON DELETE SET NULL  ON UPDATE CASCADE
);

-- ─── 5. Stall Owners ──────────────────────────────────────────
CREATE TABLE stall_owners (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(150) NOT NULL,
  contact_number  VARCHAR(20)  DEFAULT NULL,
  address         TEXT         DEFAULT NULL,
  stall_id        INT UNSIGNED DEFAULT NULL UNIQUE,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (stall_id) REFERENCES stalls(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- ─── 6. Payments ──────────────────────────────────────────────
CREATE TABLE payments (
  id              INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  owner_id        INT UNSIGNED  NOT NULL,
  or_number       VARCHAR(50)   NOT NULL,
  control_number  VARCHAR(50)   DEFAULT NULL,
  payment_date    DATE          NOT NULL,
  rental_fee      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  electric_fee    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  remarks         TEXT          DEFAULT NULL,
  recorded_by     INT UNSIGNED  DEFAULT NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id)    REFERENCES stall_owners(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES staff_users(id)  ON DELETE SET NULL  ON UPDATE CASCADE,
  INDEX idx_payment_date (payment_date),
  INDEX idx_owner_id     (owner_id)
);

-- ─── 7. Electric Fees ─────────────────────────────────────────
-- NOTE: No CHECK constraint, no GENERATED column — compatible with MySQL 5.7+
CREATE TABLE electric_fees (
  id            INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  stall_id      INT UNSIGNED  NOT NULL,
  year          SMALLINT UNSIGNED NOT NULL,
  month         TINYINT UNSIGNED  NOT NULL,
  reading_prev  DECIMAL(10,2) DEFAULT 0.00,
  reading_curr  DECIMAL(10,2) DEFAULT 0.00,
  consumption   DECIMAL(10,2) DEFAULT 0.00,
  rate_per_kwh  DECIMAL(8,4)  DEFAULT 0.00,
  amount_due    DECIMAL(10,2) DEFAULT 0.00,
  is_paid       TINYINT(1)    DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_electric_stall_period (stall_id, year, month),
  FOREIGN KEY (stall_id) REFERENCES stalls(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ─── 8. Activity Logs ─────────────────────────────────────────
CREATE TABLE activity_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED DEFAULT NULL,
  action      VARCHAR(100) NOT NULL,
  table_name  VARCHAR(100) DEFAULT NULL,
  record_id   INT UNSIGNED DEFAULT NULL,
  description TEXT         DEFAULT NULL,
  ip_address  VARCHAR(45)  DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES staff_users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_log_created (created_at),
  INDEX idx_log_user    (user_id)
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Staff Accounts
INSERT INTO staff_users (employee_id, full_name, role, department) VALUES
  ('ADMIN-001', 'Bernadette Obañana',       'admin',   'Office of the Municipal Treasurer'),
  ('CASH-001',  'Juan dela Cruz',     'cashier', 'Collection Division'),
  ('CASH-002',  'Rosa Reyes',         'cashier', 'Collection Division'),
  ('STAFF-001', 'Pedro Bautista',     'staff',   'Records Section'),
  ('STAFF-002', 'Liza Gonzales',      'staff',   'Records Section');

-- Buildings
INSERT INTO buildings (name, description, location) VALUES
  ('Food Stalls Building', 'Cooked food and eateries',        'Ground Floor, Main Market'),
  ('Pasalubong Center',    'Souvenir and native products',     'Second Floor, Main Market'),
  ('Dry Section',          'Dry goods and hardware',           'North Wing'),
  ('Corner Stalls',        'Corner-positioned stalls',         'Market Perimeter'),
  ('Inner Stalls',         'Interior market stalls',           'Market Interior');

-- Stall Categories
INSERT INTO stall_categories (name) VALUES
  ('Food & Beverages'),
  ('Dry Goods'),
  ('Vegetables & Fruits'),
  ('Clothing & Apparel'),
  ('Hardware & Tools'),
  ('Native Products'),
  ('General Merchandise');

-- Stalls
INSERT INTO stalls (stall_number, building_id, category_id, rental_rate, security_deposit, electric_fee, status, date_started) VALUES
  ('FS-001', 1, 1, 1500.00, 3000.00, 200.00, 'occupied',   '2023-01-01'),
  ('FS-002', 1, 1, 1500.00, 3000.00, 200.00, 'occupied',   '2023-01-01'),
  ('FS-003', 1, 1, 1500.00, 3000.00, 200.00, 'occupied',   '2023-03-15'),
  ('FS-004', 1, 1, 1500.00, 3000.00, 200.00, 'vacant',     NULL),
  ('FS-005', 1, 3, 1200.00, 2400.00, 150.00, 'delinquent', '2022-06-01'),
  ('PC-001', 2, 6, 2000.00, 4000.00, 250.00, 'occupied',   '2023-02-01'),
  ('PC-002', 2, 6, 2000.00, 4000.00, 250.00, 'occupied',   '2023-02-01'),
  ('PC-003', 2, 6, 2000.00, 4000.00, 250.00, 'vacant',     NULL),
  ('DS-001', 3, 2, 1800.00, 3600.00, 300.00, 'occupied',   '2022-11-01'),
  ('DS-002', 3, 5, 1800.00, 3600.00, 300.00, 'occupied',   '2023-04-01'),
  ('CS-001', 4, 7, 2500.00, 5000.00, 350.00, 'occupied',   '2022-08-15'),
  ('IS-001', 5, 4, 1300.00, 2600.00, 180.00, 'occupied',   '2023-05-01'),
  ('IS-002', 5, 4, 1300.00, 2600.00, 180.00, 'vacant',     NULL);

-- Stall Owners
INSERT INTO stall_owners (full_name, contact_number, address, stall_id) VALUES
  ('Natividad Robles',   '09171234501', '123 Rizal St., Poblacion',        1);

-- Sample Payments (Year 2025)
INSERT INTO payments (owner_id, or_number, control_number, payment_date, rental_fee, electric_fee, total_amount, remarks, recorded_by) VALUES
  (1,  '2025-00101', 'CN-001', '2025-01-05', 1500.00, 200.00, 1700.00, NULL, 1);
-- ============================================================
-- VERIFY
-- ============================================================
SELECT 'staff_users'     AS tbl, COUNT(*) AS rows FROM staff_users
UNION ALL
SELECT 'buildings',      COUNT(*) FROM buildings
UNION ALL
SELECT 'stall_categories', COUNT(*) FROM stall_categories
UNION ALL
SELECT 'stalls',         COUNT(*) FROM stalls
UNION ALL
SELECT 'stall_owners',   COUNT(*) FROM stall_owners
UNION ALL
SELECT 'payments',       COUNT(*) FROM payments;
