# MarketSuite & Storefront 🛍️👞👗

A comprehensive multi-shop retail management ecosystem featuring an advanced MERN-based ERP/POS portal alongside a customer-facing e-commerce storefront.

---

## 🌟 Architecture Overview

The repository is organized into a clean multi-app workspace:

```text
MarketSuite/
├── management/                 # Management & Administration Suite
│   ├── server/                 # Express.js + MongoDB API (Protected & Public API)
│   ├── client/                 # Owner, Admin & Staff ERP Portal (React + Vite)
│   └── docs/                   # Business and technical documentation
├── store/                      # Customer E-Commerce Storefront (React + Vite + TypeScript + Tailwind)
├── docs/                       # Project architecture, API specifications & session guides
├── package.json                # Root scripts to orchestrate development
└── README.md
```

| Component | Tech Stack | Description |
|---|---|---|
| **Storefront (`store/`)** | React 18, TypeScript, Vite, TailwindCSS | Public marketplace & individual shop storefronts. Customers can browse shops, filter categories, search products, manage cart, place online orders, and track order status in real time. |
| **Management API (`management/server/`)** | Node.js, Express, MongoDB, Mongoose, JWT | Multi-tenant ERP API powering shoes and clothing shops. Provides authenticated RBAC endpoints for POS, inventory, finance, suppliers, and staff, plus high-throughput public endpoints (`/api/public/*`). |
| **Management Portal (`management/client/`)** | React, Vite, TailwindCSS | Shop owners & staff portal with POS terminals, barcode scanning, stock ledger, sales reports, employee payroll, profit & loss, and online storefront toggle. |

---

## 🚀 Key Features

### 🛒 Customer Storefront (`/store`)
- **Multi-Shop Discovery:** Browse and search all registered and active shops.
- **Dedicated Shop Pages:** Shop-specific catalogs with category tabs, search, and pagination.
- **Product Details & Stock Verification:** Real-time stock availability, size & color variants, pricing, and discount indicators.
- **Cart & Checkout:** Local storage synchronized shopping cart with customer checkout.
- **Order Tracking:** Track order progress (pending, accepted, dispatched, delivered, cancelled) via order reference number.

### 🏢 Management & ERP Portal (`/management`)
- **Point of Sale (POS):** Fast barcode scanning, custom discounts, sales returns, and receipt generation.
- **Dual-Domain Support:** Dedicated workflows tailored for **Shoe Stores** (sizes, pairs) and **Clothing Stores** (fabrics, sizes, colors).
- **Inventory & Stock Alerts:** Low-stock badges, stock adjustments, batch updates, and cost-price tracking.
- **Online Storefront Control:** Toggle your shop's online visibility and publish/unpublish products individually with a single switch.
- **Finance & Analytics:** Daily closing reports, cash drawers, profit/loss calculations, expense tracking, and supplier ledgers.
- **Staff & Payroll Management:** Attendance logging, commission tracking, salary calculations, and granular role-based permissions (Owner, Manager, Cashier, Salesman).

---

## ⚙️ Prerequisites

- **Node.js**: `v20.x` or later
- **MongoDB**: `v4.2` or later (Local MongoDB instance or MongoDB Atlas)
- **Git**

---

## 🛠️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/mavia6786/MarketSuite.git
cd MarketSuite
```

### 2. Install Dependencies
Install dependencies across all workspaces with one command:
```bash
npm run install:all
```

### 3. Environment Variables

#### Backend (`management/server/.env`)
Copy the example environment file:
```bash
cp management/server/.env.example management/server/.env
```
Configure your credentials:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/marketsuite
JWT_SECRET=your_super_secret_jwt_key
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

#### Storefront (`store/.env`)
*(Optional in local dev because Vite proxies `/api` to `localhost:5000`)*
```bash
cp store/.env.example store/.env
```

---

## 💻 Running the Application

Run all services simultaneously or in separate terminals:

```bash
# Terminal 1: Backend API (Port 5000)
npm run dev:api

# Terminal 2: Management Portal (Port 5173)
npm run dev:portal

# Terminal 3: Public Storefront (Port 5174)
npm run dev:store
```

Access the applications:
- **Customer Storefront:** [http://localhost:5174](http://localhost:5174)
- **Management ERP Portal:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

---

## 📦 Database Seeding & Migration

To populate demo shops, products, and users:

```bash
cd management/server

# Run seed script
npm run seed

# Seed full demo data
npm run seed:demo -- --yes

# Backfill slugs for existing shops (enables them for public storefront)
npm run migrate:slugs -- --yes
```

---

## 🧪 Testing & Code Quality

Run tests and type-checking across both workspaces:

```bash
# Check storefront (Linting, TypeScript compilation, Vitest suite, Vite build)
npm run check:store

# Check management (Backend unit tests, route coverage, frontend build)
npm run check:management
```

---

## 📚 Technical Documentation

Deep dive into the architecture and integration contracts:
- [Architecture Guide](file:///docs/ARCHITECTURE.md): Multi-tenant architecture and data model design.
- [Public & Management API Integration](file:///docs/API_INTEGRATION.md): Endpoint specifications and payload contracts.
- [Project Status & Roadmap](file:///docs/PROJECT_STATUS.md): Milestones, progress, and completed sprints.
- [Session Handoff](file:///docs/SESSION_HANDOFF.md): Developer notes and operational instructions.

---

## 📄 License

This project is licensed under the MIT License.
