// Route-level audit: router.delete('/:id', audit('product.delete', { entity: 'Product' }), handler)
// Writes one AuditLog row AFTER the response is sent, for every attempt that was authorised to reach the handler
// (status recorded, so failed/blocked attempts are visible too). Request body is NOT logged except keys listed in `pick`.
const auditService = require('../services/auditService');

module.exports = function audit(action, { entity = '', pick = [] } = {}) {
  return (req, res, next) => {
    res.on('finish', () => {
      const meta = {};
      pick.forEach((k) => { if (req.body && req.body[k] !== undefined) meta[k] = req.body[k]; });
      auditService.log({ req, action, entityType: entity, entityId: req.params && req.params.id, status: res.statusCode, meta });
    });
    next();
  };
};
