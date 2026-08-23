const mongoose = require('mongoose');
require('dotenv').config();

const rawUri = (process.env.MONGODB_URI || '').trim();
const dbName = process.env.MONGODB_DB || 'avril-forme';
const username = (process.env.MONGODB_USERNAME || '').trim();
const password = (process.env.MONGODB_PASSWORD || '').trim();

function buildMongoUri() {
  if (!rawUri) return 'mongodb://127.0.0.1:27017/' + dbName;
  if (rawUri.startsWith('mongodb://') || rawUri.startsWith('mongodb+srv://')) {
    return rawUri;
  }

  if (username && password) {
    return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${rawUri}/${dbName}?retryWrites=true&w=majority`;
  }

  return `mongodb+srv://${rawUri}/${dbName}?retryWrites=true&w=majority`;
}

const uri = buildMongoUri();

let isConnected = false;

async function connectDb() {
  if (isConnected) return mongoose.connection;
  await mongoose.connect(uri, {
    dbName,
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  isConnected = true;
  console.log('Connected to MongoDB', dbName);
  return mongoose.connection;
}

module.exports = { connectDb, mongoose };
