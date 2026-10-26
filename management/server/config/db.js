const mongoose = require('mongoose');

// Connects to MongoDB. Never logs the connection string (it contains the password on Atlas).
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      console.error('MONGO_URI is required in production.');
      process.exit(1);
    }
    console.warn('MONGO_URI not set - using local MongoDB at mongodb://127.0.0.1:27017/shoestoredb (development only).');
  }
  try {
    await mongoose.connect(uri || 'mongodb://127.0.0.1:27017/shoestoredb', { serverSelectionTimeoutMS: 10000 });
    console.log(`MongoDB connected: host=${mongoose.connection.host} db=${mongoose.connection.name}`);
  } catch (err) {
    console.error('MongoDB connection error:', String(err.message).replace(/\/\/[^@/]+@/g, '//***:***@'));
    process.exit(1);
  }
}

module.exports = connectDB;
