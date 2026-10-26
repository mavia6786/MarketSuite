// Runs fn(session) inside a MongoDB transaction when the deployment supports it (replica set / Atlas),
// and falls back to running fn(null) WITHOUT a transaction on a standalone mongod / stand-in.
// IMPORTANT: the fallback gives NO rollback. Flows that must stay correct on a standalone server keep their
// compensating-rollback logic (see services/common/stock.js); a transaction is an additional safety net, not a replacement.
// Usage:  await withTransaction(async (session) => { await Model.updateOne(filter, update, { session }); });
const mongoose = require('mongoose');

let supportsTx = null; // cached after first probe

async function detect() {
  if (supportsTx !== null) return supportsTx;
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    supportsTx = !!(hello.setName || hello.msg === 'isdbgrid'); // replica set member or mongos
  } catch { supportsTx = false; }
  return supportsTx;
}

async function withTransaction(fn) {
  if (!(await detect())) return fn(null);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await fn(session); });
    return result;
  } finally {
    session.endSession();
  }
}

withTransaction.supported = detect;
module.exports = withTransaction;
