const mongoose = require('mongoose');

// Atomic sequence counters (invoice / PO numbers) — avoids duplicate numbers under concurrent sales.
const schema = new mongoose.Schema({ key: { type: String, unique: true }, seq: { type: Number, default: 0 } });
const Counter = mongoose.model('Counter', schema);

Counter.next = async (key) => {
  const doc = await Counter.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return doc.seq;
};

module.exports = Counter;
