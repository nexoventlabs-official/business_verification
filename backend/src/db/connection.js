const mongoose = require('mongoose');

let connected = false;

async function connectDB() {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env');
  await mongoose.connect(uri);
  connected = true;
  console.log('[db] MongoDB connected');
}

module.exports = { connectDB };
