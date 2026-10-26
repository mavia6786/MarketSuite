// Shop-scope guard (Mongoose global plugin). Every query on a model that has a `shopId` path must mention shopId in its filter,
// so a forgotten `shopId` can never silently expose another shop's data.
//   default (ENFORCE_SHOP_SCOPE unset or 1) -> throws, so the request fails (500) instead of leaking data
//   ENFORCE_SHOP_SCOPE=0  -> only logs a warning once per model+operation (debugging aid)
// Deliberate cross-shop access (admin scripts): query.setOptions({ allowCrossShop: true }).
// Models that are inherently cross-shop for authentication (User) opt out with schema option { shopScopeExempt: true }.
const OPS = ['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'countDocuments', 'distinct'];
const warned = new Set();
const enforce = () => process.env.ENFORCE_SHOP_SCOPE !== '0'; // ON by default; set ENFORCE_SHOP_SCOPE=0 only to downgrade to warnings while debugging

function violation(model, op) {
  const msg = `Unscoped query: ${model}.${op} has no shopId in its filter.`;
  if (enforce()) throw new Error(msg);
  const key = model + op;
  if (!warned.has(key)) { warned.add(key); console.warn('WARNING (shop scope):', msg); }
}

module.exports = function shopScope(schema) {
  if (schema.options.shopScopeExempt || !schema.path('shopId')) return;
  schema.pre(OPS, function () {
    if (this.getOptions().allowCrossShop) return;
    if (!JSON.stringify(this.getFilter()).includes('"shopId"')) violation(this.model.modelName, this.op);
  });
  schema.pre('aggregate', function () {
    if (this.options && this.options.allowCrossShop) return;
    const m = this.pipeline().find((s) => s.$match);
    if (!m || !JSON.stringify(m.$match).includes('"shopId"')) violation(this._model.modelName, 'aggregate');
  });
};
