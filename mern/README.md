# 👟👗 ShoeStore & ClothStore — MERN Full-Stack Management System

> A multi-vertical retail management system built with the **MERN stack** (MongoDB, Express.js, React, Node.js). Manage two independent store verticals — **Shoe Store** and **Cloth Store** — from a single unified platform with role-based access control, Point of Sale, inventory tracking, staff management, supplier management, financial reports, and more.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Environment Variables](#-environment-variables)
- [Demo Credentials](#-demo-credentials)
- [API Endpoints](#-api-endpoints)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Database Models](#-database-models)
- [Available Scripts](#-available-scripts)
- [Testing](#-testing)
- [Security Features](#-security-features)
- [Screenshots](#-screenshots)
- [License](#-license)

---

## ✨ Features

### 🏪 Multi-Vertical Store Support
- **Shoe Store** — Full product, sales, and staff management for footwear
- **Cloth Store** — Independent product, sales, and staff management for clothing
- Each vertical has its own dedicated dashboard, POS, inventory, reports, and staff modules
- Shop-scoped data isolation ensures each shop's data remains private

### 🛒 Point of Sale (POS)
- Fast, intuitive POS interface for both shoe and clothing sales
- Real-time cart management with add/remove/quantity adjustments
- Sale invoice generation with customer details
- Barcode / article number product lookup

### 📦 Product & Inventory Management
- Full CRUD operations for products (add, edit, view, delete)
- Stock level tracking with low-stock alerts
- Stock adjustment capability
- Product categorization with size, color, brand, and article number support
- Separate inventory views for shoes and clothes

### 💰 Financial Management
- Revenue and expense tracking
- Profit & Loss reports
- Supplier payment tracking
- Daily/monthly/yearly financial summaries
- Expense management with categorization

### 👥 Staff & HR Management
- Salesman profiles and management
- Attendance marking and tracking
- Salary records and payroll management
- Advance payment tracking
- Staff performance tracking per vertical

### 🚚 Supplier Management
- Supplier profiles with contact details
- Purchase order tracking
- Payment history and outstanding balance management
- Supplier-specific reports

### 📊 Reports & Analytics
- Admin dashboard with key business metrics
- Sales history with advanced filtering and date ranges
- Revenue reports with daily/monthly breakdowns
- Inventory valuation reports
- Comprehensive business analytics per vertical

### 👤 User & Authentication System
- JWT-based authentication with secure token management
- Role-Based Access Control (RBAC) with 5 roles
- User registration and shop registration
- Password change functionality
- Account lockout after failed login attempts
- Public signup toggle (can be enabled/disabled)

### 🔍 Audit Logging
- Tracks user actions across the system
- Viewable audit trail for accountability

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | ^18.3.1 | UI library |
| **React Router DOM** | ^6.24.1 | Client-side routing |
| **Axios** | ^1.7.2 | HTTP client for API calls |
| **Vite** | ^5.3.3 | Build tool and dev server |
| **CSS** | — | Custom styling (no Tailwind) |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | — | Runtime environment |
| **Express.js** | ^4.19.2 | Web framework |
| **Mongoose** | ^8.5.0 | MongoDB ODM |
| **JSON Web Token** | ^9.0.2 | Authentication |
| **bcryptjs** | ^2.4.3 | Password hashing |
| **Helmet** | ^8.3.0 | Security headers |
| **CORS** | ^2.8.5 | Cross-origin resource sharing |
| **dotenv** | ^16.4.5 | Environment variable management |
| **Nodemon** | ^3.1.4 | Hot-reloading (dev) |

### Database
| Technology | Purpose |
|---|---|
| **MongoDB Atlas** | Cloud-hosted NoSQL database |

---

## 📁 Project Structure

```
mern/
├── client/                          # Frontend (React + Vite)
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── FinanceStrip.jsx     # Financial summary bar
│   │   │   └── RequirePermission.jsx # RBAC route guard
│   │   ├── context/                 # React Context providers
│   │   │   ├── AuthContext.jsx      # Authentication state
│   │   │   ├── ShoeCartContext.jsx   # Shoe POS cart state
│   │   │   └── ClothingCartContext.jsx # Clothing POS cart state
│   │   ├── layouts/                 # Layout wrappers
│   │   │   ├── MainLayout.jsx       # Public pages layout
│   │   │   ├── ShoesDashboardLayout.jsx   # Shoe dashboard sidebar
│   │   │   └── ClothingDashboardLayout.jsx # Clothing dashboard sidebar
│   │   ├── pages/
│   │   │   ├── Home.jsx             # Landing / home page
│   │   │   ├── LoginPage.jsx        # Sign in
│   │   │   ├── SignUpPage.jsx       # Sign up
│   │   │   ├── RegisterShopPage.jsx # Shop registration
│   │   │   ├── ChangePasswordPage.jsx # Change password
│   │   │   ├── NotFound.jsx         # 404 page
│   │   │   ├── shoes/               # 👟 Shoe Store pages
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── POS.jsx
│   │   │   │   ├── Products.jsx
│   │   │   │   ├── AddEditProduct.jsx
│   │   │   │   ├── Inventory.jsx
│   │   │   │   ├── SalesHistory.jsx
│   │   │   │   └── Reports.jsx
│   │   │   ├── clothes/             # 👗 Cloth Store pages
│   │   │   │   ├── ClothingDashboard.jsx
│   │   │   │   ├── ClothingPOS.jsx
│   │   │   │   ├── ClothingProducts.jsx
│   │   │   │   ├── ClothingInventory.jsx
│   │   │   │   ├── ClothingSalesHistory.jsx
│   │   │   │   └── ClothingReports.jsx
│   │   │   └── shared/              # 🔄 Shared pages (both verticals)
│   │   │       ├── UsersPage.jsx
│   │   │       ├── StaffManager.jsx
│   │   │       ├── SuppliersPage.jsx
│   │   │       └── FinancePage.jsx
│   │   ├── services/                # API service layers
│   │   │   ├── api.js               # Axios instance config
│   │   │   ├── authApi.js           # Auth endpoints
│   │   │   ├── shoesApi.js          # Shoe product/sales endpoints
│   │   │   ├── clothesApi.js        # Clothing product/sales endpoints
│   │   │   ├── staffApi.js          # Staff/salesman endpoints
│   │   │   ├── financeApi.js        # Finance endpoints
│   │   │   └── miscApi.js           # Shop, supplier, user endpoints
│   │   ├── utils/                   # Utility functions
│   │   ├── App.jsx                  # Root component with routes
│   │   └── main.jsx                 # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                          # Backend (Node.js + Express)
│   ├── config/
│   │   ├── db.js                    # MongoDB connection
│   │   └── permissions.js           # RBAC roles & permissions
│   ├── controllers/
│   │   ├── authController.js        # Login, signup, token logic
│   │   ├── userController.js        # User management
│   │   ├── auditController.js       # Audit log queries
│   │   ├── supplierController.js    # Supplier CRUD & payments
│   │   ├── financeController.js     # Finance/expense endpoints
│   │   ├── shoes/                   # Shoe-specific controllers
│   │   ├── clothes/                 # Clothing-specific controllers
│   │   └── common/                  # Shared controller logic
│   ├── middleware/
│   │   ├── auth.js                  # JWT auth & permission guards
│   │   ├── audit.js                 # Audit logging middleware
│   │   └── rateLimit.js             # Rate limiting
│   ├── models/
│   │   ├── User.js                  # User model
│   │   ├── Shop.js                  # Shop model
│   │   ├── Supplier.js              # Supplier model
│   │   ├── SupplierOrder.js         # Purchase orders
│   │   ├── Expense.js               # Expense model
│   │   ├── Counter.js               # Auto-increment counters
│   │   ├── AuditLog.js              # Audit trail model
│   │   ├── shoes/                   # 👟 Shoe models
│   │   │   ├── Product.js
│   │   │   ├── Sale.js
│   │   │   ├── Salesman.js
│   │   │   ├── SalesmanAttendance.js
│   │   │   ├── ShoeAdvance.js
│   │   │   └── ShoeSalaryRecord.js
│   │   └── clothes/                 # 👗 Clothing models
│   │       ├── ClothingProduct.js
│   │       ├── ClothingSale.js
│   │       ├── ClothingSalesman.js
│   │       ├── ClothingSalesmanAttendance.js
│   │       ├── ClothingAdvance.js
│   │       └── ClothingSalaryRecord.js
│   ├── routes/
│   │   ├── authRoutes.js            # POST /api/auth/*
│   │   ├── userRoutes.js            # /api/users/*
│   │   ├── shopRoutes.js            # /api/shop/*
│   │   ├── shoesRoutes.js           # /api/shoes/*
│   │   ├── clothesRoutes.js         # /api/clothes/*
│   │   ├── supplierRoutes.js        # /api/suppliers/*
│   │   ├── financeRoutes.js         # /api/finance/*
│   │   └── common/                  # Shared route logic
│   ├── plugins/
│   │   └── shopScope.js             # Mongoose plugin for multi-tenancy
│   ├── scripts/
│   │   └── createOwner.js           # CLI script to create owner user
│   ├── services/                    # Business logic services
│   ├── tests/
│   │   ├── unit.js                  # Unit tests
│   │   ├── probe.js                 # API probe tests
│   │   ├── authz.js                 # Authorization tests
│   │   └── routeCoverage.js         # Route coverage verification
│   ├── utils/                       # Utility helpers
│   ├── seed.js                      # Database seeder
│   ├── seedDemo.js                  # Demo data seeder
│   ├── migrate.js                   # Database migrations
│   ├── server.js                    # Express app entry point
│   ├── .env                         # Environment variables
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 📌 Prerequisites

Make sure you have the following installed:

- **Node.js** — v18 or higher ([Download](https://nodejs.org/))
- **npm** — v9 or higher (comes with Node.js)
- **MongoDB Atlas** account — ([Sign up free](https://www.mongodb.com/cloud/atlas/register))
- **Git** — ([Download](https://git-scm.com/))

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ShoeStore-MERN.git
cd ShoeStore-MERN/mern
```

### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file (see Environment Variables section below)
# Then start the development server
npm run dev
```

The backend server will start on **http://localhost:5000**

### 3. Frontend Setup

Open a **new terminal**:

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on **http://localhost:5173**

---

## ⚙ Environment Variables

Create a `.env` file inside the `server/` directory:

```env
# ─── Database ───────────────────────────────────────────────────
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/shoestoredb?retryWrites=true&w=majority

# ─── Authentication ─────────────────────────────────────────────
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=8h

# ─── Server ─────────────────────────────────────────────────────
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# ─── Timezone ───────────────────────────────────────────────────
TZ_OFFSET_MINUTES=300          # PKT (UTC+5) = 300 minutes

# ─── Security ───────────────────────────────────────────────────
ALLOW_PUBLIC_SIGNUP=true        # Allow users to register themselves
MAX_FAILED_LOGINS=5             # Lock account after N failed attempts
LOCKOUT_MINUTES=15              # Lockout duration in minutes
AUTH_RATE_MAX=60                # Max auth requests per minute per IP
API_RATE_MAX=600                # Max API requests per minute per IP

# ─── Multi-Tenancy ──────────────────────────────────────────────
ENFORCE_SHOP_SCOPE=1            # Enforce shop-level data isolation
```

> ⚠️ **Important:** If your MongoDB password contains special characters (like `@`, `#`, `:`, `/`), they must be URL-encoded. For example: `@` → `%40`

---

## 🔑 Demo Credentials

| Store | Email | Password |
|---|---|---|
| 👟 **Shoe Store** | `admin@stepup.pk` | `Admin@123` |
| 👗 **Cloth Store** | `admin@styleub.pk` | `Admin@123` |

> These credentials are pre-seeded demo accounts with **Owner** role (full access).

To seed demo data:
```bash
cd server
npm run seed:demo
```

---

## 🌐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login with email & password |
| `POST` | `/api/auth/signup` | Register a new user |
| `GET` | `/api/health` | Health check |

### Users
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | List all users (Owner/Manager) |
| `POST` | `/api/users` | Create a new user |
| `PUT` | `/api/users/:id` | Update user details |
| `DELETE` | `/api/users/:id` | Delete a user |

### Shop
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/shop` | Get shop details |
| `PUT` | `/api/shop` | Update shop profile |
| `POST` | `/api/shop/register` | Register a new shop |

### Shoes — Products & Sales
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/shoes/products` | List shoe products |
| `POST` | `/api/shoes/products` | Add a new shoe product |
| `PUT` | `/api/shoes/products/:id` | Update a shoe product |
| `DELETE` | `/api/shoes/products/:id` | Delete a shoe product |
| `GET` | `/api/shoes/sales` | Get shoe sales history |
| `POST` | `/api/shoes/sales` | Create a new shoe sale |

### Clothes — Products & Sales
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/clothes/products` | List clothing products |
| `POST` | `/api/clothes/products` | Add a new clothing product |
| `PUT` | `/api/clothes/products/:id` | Update a clothing product |
| `DELETE` | `/api/clothes/products/:id` | Delete a clothing product |
| `GET` | `/api/clothes/sales` | Get clothing sales history |
| `POST` | `/api/clothes/sales` | Create a new clothing sale |

### Suppliers
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/suppliers` | List suppliers |
| `POST` | `/api/suppliers` | Add a supplier |
| `PUT` | `/api/suppliers/:id` | Update supplier |
| `DELETE` | `/api/suppliers/:id` | Delete supplier |

### Finance
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/finance/summary` | Financial summary |
| `GET` | `/api/finance/expenses` | List expenses |
| `POST` | `/api/finance/expenses` | Add an expense |

### Audit Logs
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/audit-logs` | View audit trail |

---

## 🛡 Role-Based Access Control (RBAC)

The system supports **5 user roles** with granular permissions:

| Role | Description | Key Permissions |
|---|---|---|
| **Owner** | Full access to everything | All permissions including user management & shop settings |
| **Manager** | Day-to-day shop operations | Products, sales, refunds, reports, expenses, suppliers, staff (no user management) |
| **Cashier** | Point of Sale only | View products, view/create sales |
| **StockManager** | Inventory & catalogue | Products, stock adjustments, suppliers, receiving orders |
| **Accountant** | Financial oversight | Reports, expenses, supplier payments, payroll, audit logs |

### Permissions Matrix

| Permission | Owner | Manager | Cashier | StockManager | Accountant |
|---|:---:|:---:|:---:|:---:|:---:|
| `products.view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `products.create` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `products.edit` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `products.delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `stock.adjust` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `sales.view` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `sales.create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `sales.refund` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `reports.view` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `finance.view` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `expenses.view` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `expenses.manage` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `suppliers.view` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `suppliers.manage` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `purchases.receive` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `supplier.pay` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `staff.view` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `staff.manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `attendance.mark` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `payroll.view` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `payroll.manage` | ✅ | ❌ | ❌ | ❌ | ✅ |
| `users.manage` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `shop.edit` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `audit.view` | ✅ | ✅ | ❌ | ❌ | ✅ |

---

## 🗄 Database Models

### Core Models
| Model | Description |
|---|---|
| `User` | User accounts with role, shop association, and login security |
| `Shop` | Shop profiles (name, address, contact) |
| `Supplier` | Supplier details and payment tracking |
| `SupplierOrder` | Purchase orders from suppliers |
| `Expense` | Business expenses |
| `Counter` | Auto-increment counters for invoice/order numbers |
| `AuditLog` | System audit trail |

### Shoe Store Models
| Model | Description |
|---|---|
| `Product` | Shoe products (brand, article, size, color, stock, cost, price) |
| `Sale` | Shoe sales transactions |
| `Salesman` | Shoe store staff profiles |
| `SalesmanAttendance` | Shoe staff attendance records |
| `ShoeAdvance` | Advance payments to shoe staff |
| `ShoeSalaryRecord` | Shoe staff salary records |

### Cloth Store Models
| Model | Description |
|---|---|
| `ClothingProduct` | Clothing products (brand, article, size, color, stock, cost, price) |
| `ClothingSale` | Clothing sales transactions |
| `ClothingSalesman` | Clothing store staff profiles |
| `ClothingSalesmanAttendance` | Clothing staff attendance records |
| `ClothingAdvance` | Advance payments to clothing staff |
| `ClothingSalaryRecord` | Clothing staff salary records |

---

## 📜 Available Scripts

### Backend (`server/`)

```bash
npm run dev          # Start server with hot-reload (nodemon)
npm start            # Start server for production
npm run seed         # Seed database with initial data
npm run seed:demo    # Seed demo data
npm run migrate      # Run database migrations
npm run create-owner # Create an owner user via CLI
npm run test:unit    # Run unit tests
npm run test:probe   # Run API probe tests
npm run test:authz   # Run authorization tests
npm run test:routes  # Verify route coverage
```

### Frontend (`client/`)

```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build locally
```

---

## 🧪 Testing

The backend includes multiple testing layers:

```bash
# Unit tests — core logic
npm run test:unit

# API probe tests — endpoint verification
npm run test:probe

# Authorization tests — RBAC enforcement
npm run test:authz

# Route coverage — ensures all routes are tested
npm run test:routes
```

---

## 🔒 Security Features

- **JWT Authentication** — Stateless token-based auth with configurable expiry
- **Password Hashing** — bcryptjs for secure password storage
- **Helmet.js** — Secure HTTP headers (noSniff, frameguard, HSTS)
- **Rate Limiting** — Per-IP rate limits on auth and API endpoints
- **Account Lockout** — Automatic lockout after configurable failed login attempts
- **CORS Configuration** — Configurable allowed origins
- **Input Validation** — Mongoose schema validation + Express error handling
- **Audit Logging** — Track user actions for accountability
- **Shop Scoping** — Multi-tenant data isolation via Mongoose plugin
- **Error Sanitization** — Connection strings and secrets are never exposed in error messages

---

## 📸 Screenshots

> _Coming soon — add screenshots of your Dashboard, POS, Inventory, and Reports pages here._

<!--
![Dashboard](./screenshots/dashboard.png)
![POS](./screenshots/pos.png)
![Inventory](./screenshots/inventory.png)
![Reports](./screenshots/reports.png)
-->

---

## 📄 License

This project is developed for educational and commercial purposes.

---

## 👨‍💻 Author

**Mavia Ali**

---

> ⭐ If you found this project helpful, give it a star on GitHub!
