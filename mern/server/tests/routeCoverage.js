// Lists every HTTP route registered by the app and FAILS if a route that is not on the public/auth-only allow-list
// lacks an explicit requirePermission()/requireAnyPermission(). No server or database needed:  npm run test:routes
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const app = require('../server');

// Routes that intentionally have no permission: public, or "any signed-in user" (documented in ARCHITECTURE.md §RBAC).
const ALLOW = new Set([
  'GET /api/health',
  'POST /api/auth/login', 'POST /api/auth/register',                                   // public (rate limited)
  'POST /api/auth/register-shop', 'GET /api/auth/me', 'POST /api/auth/refresh', 'POST /api/auth/logout', 'POST /api/auth/change-password', // any signed-in user, own account only
  'GET /api/shop/current',                                                             // any member may read own shop profile
]);

const routes = [];
function walk(stack, prefix) {
  for (const layer of stack) {
    if (layer.route) {
      const handlers = layer.route.stack.map((l) => l.handle);
      Object.keys(layer.route.methods).forEach((m) => routes.push({
        key: `${m.toUpperCase()} ${prefix}${layer.route.path === '/' ? '' : layer.route.path}`,
        guarded: handlers.some((h) => h.requiredPermissions) || (inheritedGuard.get(stack) || false),
        perms: handlers.filter((h) => h.requiredPermissions).map((h) => h.requiredPermissions.join('|')).join(','),
      }));
    } else if (layer.name === 'router' && layer.handle.stack) {
      const src = layer.regexp.source.replace('\\/?(?=\\/|$)', '').replace(/^\^/, '').replace(/\\\//g, '/');
      walk(layer.handle.stack, prefix + (src === '(?:)' ? '' : src));
    }
  }
}
const inheritedGuard = new Map();
walk(app._router.stack, '');
const api = routes.filter((r) => r.key.includes(' /api/'));
const bad = api.filter((r) => !r.guarded && !ALLOW.has(r.key));
const allowedSeen = api.filter((r) => ALLOW.has(r.key)).length;
console.log(`${api.length} API routes found; ${api.filter((r) => r.guarded).length} guarded by a permission, ${allowedSeen} on the documented allow-list.`);
if (process.env.LIST) api.forEach((r) => console.log(`${r.guarded ? 'PERM ' : 'ALLOW'}  ${r.key}  ${r.perms}`));
if (bad.length) { console.error('\nFAIL - routes without an explicit permission:\n' + bad.map((r) => '  ' + r.key).join('\n')); process.exit(1); }
console.log('PASS  every API route has an explicit permission or is on the allow-list');
process.exit(0);
