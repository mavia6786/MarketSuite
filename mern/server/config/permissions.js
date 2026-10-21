// Single source of truth for roles and permissions (RBAC).
// Every sensitive route is guarded with requirePermission('<permission>') — see middleware/auth.js.
// Permissions are plain strings 'area.action'. A role is just a named set of permissions.
// To add a role or change what a role may do, edit ROLE_PERMISSIONS only.

const PERMISSIONS = [
  'products.view', 'products.create', 'products.edit', 'products.delete', 'stock.adjust',
  'sales.view', 'sales.create', 'sales.refund',
  'reports.view', 'finance.view',
  'expenses.view', 'expenses.manage',
  'suppliers.view', 'suppliers.manage', 'purchases.receive', 'supplier.pay',
  'staff.view', 'staff.manage', 'attendance.mark', 'payroll.view', 'payroll.manage',
  'users.manage', 'shop.edit', 'audit.view',
];

const ROLES = ['Owner', 'Manager', 'Cashier', 'StockManager', 'Accountant'];

const ROLE_PERMISSIONS = {
  // Everything, including user management and shop profile.
  Owner: PERMISSIONS,

  // Runs the shop day to day: no user management, no shop profile, no payroll payments.
  Manager: [
    'products.view', 'products.create', 'products.edit', 'products.delete', 'stock.adjust',
    'sales.view', 'sales.create', 'sales.refund',
    'reports.view', 'finance.view',
    'expenses.view', 'expenses.manage',
    'suppliers.view', 'suppliers.manage', 'purchases.receive', 'supplier.pay',
    'staff.view', 'staff.manage', 'attendance.mark', 'payroll.view',
    'audit.view',
  ],

  // Point of sale only: can look up products and make sales. No refunds, costs, reports, payroll.
  Cashier: ['products.view', 'sales.view', 'sales.create'],

  // Catalogue and stock: products, stock changes, suppliers and receiving purchase orders. No sales, money or payroll.
  StockManager: [
    'products.view', 'products.create', 'products.edit', 'stock.adjust',
    'suppliers.view', 'suppliers.manage', 'purchases.receive',
  ],

  // Money side: reports, P&L, expenses, supplier payments, payroll. Cannot sell, edit products or change stock.
  Accountant: [
    'products.view', 'sales.view', 'reports.view', 'finance.view',
    'expenses.view', 'expenses.manage',
    'suppliers.view', 'supplier.pay',
    'staff.view', 'payroll.view', 'payroll.manage',
    'audit.view',
  ],
};

// Roles an Owner may assign through the user-management API. 'Owner' is never assignable through the API.
const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== 'Owner');

const normalizeRole = (role) => (ROLES.includes(role) ? role : 'Cashier'); // unknown/legacy role -> least privilege
const permissionsFor = (role) => ROLE_PERMISSIONS[normalizeRole(role)];
const hasPermission = (role, permission) => permissionsFor(role).includes(permission);

module.exports = { PERMISSIONS, ROLES, ROLE_PERMISSIONS, ASSIGNABLE_ROLES, normalizeRole, permissionsFor, hasPermission };
