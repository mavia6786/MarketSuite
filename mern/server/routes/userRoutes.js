const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const auditCtrl = require('../controllers/auditController');
const { requireAuth, requireShop, requirePermission } = require('../middleware/auth');

router.use(requireAuth, requireShop);
router.get('/', requirePermission('users.manage'), ctrl.list);
router.post('/', requirePermission('users.manage'), ctrl.create);
router.patch('/:id', requirePermission('users.manage'), ctrl.update);
router.post('/:id/reset-password', requirePermission('users.manage'), ctrl.resetPassword);
router.post('/:id/unlock', requirePermission('users.manage'), ctrl.unlock);

module.exports = router;
module.exports.auditRouter = (() => {
  const r = express.Router();
  r.use(requireAuth, requireShop);
  r.get('/', requirePermission('audit.view'), auditCtrl.list);
  return r;
})();
