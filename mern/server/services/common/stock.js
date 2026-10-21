// Atomic stock helpers. A sale line is only deducted if enough stock exists AT THE MOMENT OF THE UPDATE
// (conditional $inc), so two simultaneous sales can never oversell. If any line fails, earlier lines are rolled back.
const sumByProduct = (lines) => {
  const need = new Map();
  lines.forEach((l) => need.set(String(l.productId), (need.get(String(l.productId)) || 0) + l.quantity));
  return need;
};

async function restoreStock(Model, shopId, entries) {
  for (const [id, qty] of entries) {
    await Model.updateOne({ _id: id, shopId }, { $inc: { stockQuantity: qty }, $set: { updatedAt: new Date() } });
  }
}

async function deductStock(Model, shopId, lines) {
  const done = [];
  try {
    for (const [id, qty] of sumByProduct(lines)) {
      const r = await Model.updateOne(
        { _id: id, shopId, isActive: true, stockQuantity: { $gte: qty } },
        { $inc: { stockQuantity: -qty }, $set: { updatedAt: new Date() } }
      );
      if (r.modifiedCount !== 1) {
        const p = await Model.findOne({ _id: id, shopId });
        if (!p || !p.isActive) throw new Error(`Product not available: ${p ? p.name : 'unknown product'}.`);
        throw new Error(`Insufficient stock for ${p.name}. Available: ${Math.max(0, p.stockQuantity)}`);
      }
      done.push([id, qty]);
    }
  } catch (err) {
    await restoreStock(Model, shopId, done);
    throw err;
  }
  return done; // [[productId, qty], ...] — pass to restoreStock() to undo
}

module.exports = { deductStock, restoreStock, sumByProduct };
