# 🏛️ Stall Revenue Monitoring System (SRMS)
### Municipal Treasurer's Office — Full-Stack Web Application

---

## 📁 Project Structure

```
stall-revenue-system/
├── client/                         ← React + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Topbar.jsx
│   │   │   ├── DashboardCards.jsx
│   │   │   ├── Charts.jsx
│   │   │   ├── PaymentLedgerTable.jsx
│   │   │   ├── StallFormModal.jsx
│   │   │   ├── PaymentModal.jsx
│   │   │   └── Loader.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Buildings.jsx
│   │   │   ├── Stalls.jsx
│   │   │   ├── StallOwners.jsx
│   │   │   ├── Payments.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── StaffManagement.jsx
│   │   │   └── Settings.jsx
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx
│   │   ├── services/
│   │   │   └── api.js              ← Axios instance
│   │   ├── routes/
│   │   │   └── AppRoutes.jsx
│   │   ├── utils/
│   │   │   ├── exportExcel.js      ← ExcelJS export
│   │   │   └── formatCurrency.js
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── styles/
│   │   │   └── tables.css          ← Ledger table styles
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── server/                         ← Node.js + Express Backend
    ├── controllers/
    │   ├── authController.js
    │   ├── buildingController.js
    │   ├── stallController.js
    │   ├── ownerController.js
    │   ├── paymentController.js
    │   ├── staffController.js
    │   └── dashboardController.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── buildingRoutes.js
    │   ├── stallRoutes.js
    │   ├── ownerRoutes.js
    │   ├── paymentRoutes.js
    │   ├── staffRoutes.js
    │   ├── dashboardRoutes.js
    │   └── categoryRoutes.js
    ├── middleware/
    │   ├── authMiddleware.js
    │   └── roleMiddleware.js
    ├── database/
    │   ├── db.js
    │   └── schema.sql              ← Full MySQL schema + seed data
    ├── app.js
    ├── .env
    └── package.json
```

---

## ✅ Prerequisites

Before you begin, make sure you have installed:

| Tool        | Version  | Download                          |
|-------------|----------|-----------------------------------|
| Node.js     | v18+     | https://nodejs.org                |
| npm         | v9+      | (comes with Node.js)              |
| MySQL       | v8.0+    | https://dev.mysql.com/downloads/  |
| Git         | any      | https://git-scm.com               |

---

## 🚀 STEP-BY-STEP INSTALLATION

---

### STEP 1 — Set Up MySQL Database

Open your MySQL client (MySQL Workbench, TablePlus, or terminal):

```bash
# Log in to MySQL
mysql -u root -p

# Inside MySQL, run the schema file:
source /path/to/stall-revenue-system/server/database/schema.sql
```

**Or** paste the contents of `server/database/schema.sql` directly into MySQL Workbench and execute it.

This will:
- Create the `stall_revenue_db` database
- Create all 8 tables
- Insert demo staff accounts, buildings, stalls, owners, and payments

**Verify the setup:**
```sql
USE stall_revenue_db;
SHOW TABLES;
SELECT employee_id, full_name, role FROM staff_users;
```

---

### STEP 2 — Configure Backend Environment

Navigate to the server folder and open `.env`:

```bash
cd stall-revenue-system/server
```

Edit the `.env` file with your MySQL credentials:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=stall_rental_db

SESSION_SECRET=change_this_to_a_long_random_string_in_production
SESSION_MAX_AGE=86400000
```

---

### STEP 3 — Install Backend Dependencies

```bash
# Make sure you are inside the server/ folder
cd stall-revenue-system/server

npm install
```

This installs:
- `express` — Web framework
- `mysql2` — MySQL driver (promise-based)
- `cors` — Cross-Origin Resource Sharing
- `express-session` — Session management
- `dotenv` — Environment variables
- `nodemon` — Auto-restart during development

---

### STEP 4 — Start the Backend Server

```bash
# Development mode (auto-restarts on file changes)
npm run dev

# OR production mode
npm start
```

You should see:
```
🏛️  SRMS Backend running on http://localhost:5000
📋  Environment: development
✅  MySQL connected successfully
```

**Test the API:**
```
GET http://localhost:5000/api/health
```
Expected response: `{ "status": "ok", "timestamp": "..." }`

---

### STEP 5 — Install Frontend Dependencies

Open a **new terminal window** and navigate to the client folder:

```bash
cd stall-revenue-system/client

npm install
```

This installs:
- `react` + `react-dom` — UI framework
- `react-router-dom` — Client-side routing
- `axios` — HTTP client for API calls
- `recharts` — Charts and graphs
- `exceljs` — Excel file generation
- `react-icons` — Icon library
- `tailwindcss` — Utility CSS framework
- `vite` — Fast build tool

---

### STEP 6 — Start the Frontend

```bash
# Make sure you are inside the client/ folder
cd stall-revenue-system/client

npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### STEP 7 — Open the Application

Open your browser and go to:
```
http://localhost:5173
```

You will see the **Treasurer's Office login page**.

---

---

## 🔌 API Endpoints Reference

### Authentication
| Method | Endpoint           | Description          | Auth Required |
|--------|--------------------|----------------------|---------------|
| POST   | `/api/auth/login`  | Login with employee ID | No          |
| POST   | `/api/auth/logout` | Logout               | Yes           |
| GET    | `/api/auth/me`     | Get current user     | Yes           |

### Dashboard
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | `/api/dashboard/stats`          | Summary statistics       |
| GET    | `/api/dashboard/revenue?year=X` | Monthly revenue data     |
| GET    | `/api/dashboard/buildings`      | Revenue by building      |

### Buildings
| Method | Endpoint              | Description      | Role           |
|--------|-----------------------|------------------|----------------|
| GET    | `/api/buildings`      | Get all          | Any            |
| POST   | `/api/buildings`      | Create           | Admin, Cashier |
| PUT    | `/api/buildings/:id`  | Update           | Admin, Cashier |
| DELETE | `/api/buildings/:id`  | Delete           | Admin only     |

### Stalls
| Method | Endpoint             | Description              | Role           |
|--------|----------------------|--------------------------|----------------|
| GET    | `/api/stalls`        | Get all (filter: status, building_id) | Any |
| POST   | `/api/stalls`        | Create                   | All roles      |
| PUT    | `/api/stalls/:id`    | Update                   | All roles      |
| DELETE | `/api/stalls/:id`    | Delete                   | Admin only     |

### Stall Owners
| Method | Endpoint            | Role           |
|--------|---------------------|----------------|
| GET    | `/api/owners`       | Any            |
| POST   | `/api/owners`       | All roles      |
| PUT    | `/api/owners/:id`   | All roles      |
| DELETE | `/api/owners/:id`   | Admin only     |

### Payments
| Method | Endpoint               | Query Params                    |
|--------|------------------------|---------------------------------|
| GET    | `/api/payments`        | `?year=&month=&building_id=&owner_id=` |
| POST   | `/api/payments`        | —                               |
| PUT    | `/api/payments/:id`    | —                               |
| DELETE | `/api/payments/:id`    | Admin only                      |

### Staff (Admin only)
| Method | Endpoint          |
|--------|-------------------|
| GET    | `/api/staff`      |
| POST   | `/api/staff`      |
| PUT    | `/api/staff/:id`  |
| DELETE | `/api/staff/:id`  |

### Stall Categories
| Method | Endpoint                    | Role        |
|--------|-----------------------------|-------------|
| GET    | `/api/stall-categories`     | Any         |
| POST   | `/api/stall-categories`     | Admin only  |
| DELETE | `/api/stall-categories/:id` | Admin only  |

---

## 🗄️ Database Tables

| Table              | Description                                  |
|--------------------|----------------------------------------------|
| `staff_users`      | System users with roles (admin/cashier/staff)|
| `buildings`        | Market buildings                             |
| `stall_categories` | Stall type categories                        |
| `stalls`           | Individual stall records                     |
| `stall_owners`     | Stall tenant information                     |
| `payments`         | Payment/OR records                           |
| `electric_fees`    | Monthly electric meter readings              |
| `activity_logs`    | User action audit trail                      |

---

## 📊 Features Summary

| Feature                | Description                                           |
|------------------------|-------------------------------------------------------|
| 🔐 Login               | Employee ID-only login, no passwords                  |
| 👥 Role-based Access   | Admin / Cashier / Staff with different permissions    |
| 🏢 Buildings           | Manage multiple market buildings                      |
| 🏪 Stalls              | Add/edit stalls, track status (occupied/vacant/delinquent) |
| 👤 Stall Owners        | Register and assign owners to stalls                  |
| 💰 Payments            | Record OR payments with auto-calculated totals        |
| 📒 Payment Ledger      | Handwritten-style monthly ledger table                |
| 📈 Dashboard           | Live stats cards + revenue charts                     |
| 📋 Reports             | Monthly ledger & collection reports with filters      |
| 📥 Excel Export        | Export full ledger or collection report to `.xlsx`    |
| 🖨️ Print               | Browser print for reports                             |

---

## ⚡ Axios Setup (How Frontend Calls Backend)

The `client/src/services/api.js` file configures Axios:

```js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',        // Vite proxies this to http://localhost:5000/api
  withCredentials: true,  // Sends session cookie with every request
});
```

Example usage in any component:

```js
import api from '../services/api';

// GET
const res = await api.get('/payments?year=2025');
console.log(res.data);

// POST
await api.post('/payments', {
  owner_id: 1,
  or_number: '2025-001',
  payment_date: '2025-01-05',
  rental_fee: 1500,
  electric_fee: 200,
  total_amount: 1700,
});

// PUT
await api.put('/stalls/3', { status: 'occupied' });

// DELETE
await api.delete('/buildings/2');
```

---

## 🧪 Testing the API Manually

Use **Postman**, **Insomnia**, or **curl**:

```bash
# 1. Login (get session cookie)
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employee_id": "ADMIN-001"}'

# 2. Get buildings (with session cookie)
curl -b cookies.txt http://localhost:5000/api/buildings

# 3. Get payments for 2025
curl -b cookies.txt "http://localhost:5000/api/payments?year=2025"

# 4. Get dashboard stats
curl -b cookies.txt http://localhost:5000/api/dashboard/stats
```

---

## 🏃 Running Both Servers Together

You need **two terminal windows** running simultaneously:

**Terminal 1 – Backend:**
```bash
cd stall-revenue-system/server
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 – Frontend:**
```bash
cd stall-revenue-system/client
npm run dev
# Runs on http://localhost:5173
```

Then open: **http://localhost:5173**

> The Vite dev server proxies all `/api/*` requests to `localhost:5000`, so CORS is handled automatically.

---

## 🔧 Troubleshooting

### ❌ "Database connection failed"
- Check your `.env` DB_PASSWORD matches your MySQL password
- Make sure MySQL server is running: `sudo service mysql start`
- Verify the database was created: `mysql -u root -p -e "SHOW DATABASES;"`

### ❌ "401 Unauthorized" on all API calls
- Make sure the backend is running on port 5000
- Check that `withCredentials: true` is in `api.js`
- Clear browser cookies and log in again

### ❌ "Cannot find module" errors
- Run `npm install` in both `client/` and `server/` folders

### ❌ Excel export not working
- Make sure `exceljs` is installed: `npm install exceljs` inside `client/`
- Check browser console for errors

### ❌ Vite proxy not working
- Confirm `vite.config.js` has the proxy configured to port 5000
- Restart the Vite dev server after any config changes

---

## 🏗️ Production Build

```bash
# Build frontend
cd client
npm run build          # Creates client/dist/ folder

# Serve static files from Express (add to server/app.js):
# app.use(express.static(path.join(__dirname, '../client/dist')));
```

---

## 📝 Notes

- The system is designed for **internal government use only**
- All sessions expire after **24 hours** (configurable in `.env`)
- The payment ledger table is styled to resemble **traditional handwritten logbooks**
- Excel exports use **ExcelJS** with government-style formatting and headers
- All monetary values use **Philippine Peso (PHP)** formatting
