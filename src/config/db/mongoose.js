const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB URI with fallback
const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://dangvu123:dangvu123@dangvu.lz9hp1j.mongodb.net/PerfumeShop?retryWrites=true&w=majority";

console.log("🔗 MongoDB URI:", uri ? "URI loaded successfully" : "URI not found");

// Mongoose connection options
const options = {
  serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  retryWrites: true,
  w: "majority",
};

// Connect to MongoDB using Mongoose
async function connectDB() {
  try {
    console.log("🔄 Connecting to MongoDB with Mongoose...");

    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log("✅ MongoDB already connected");
      return mongoose.connection;
    }

    // Connect to MongoDB
    await mongoose.connect(uri, options);

    console.log("✅ Connected to MongoDB Atlas successfully!");
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return mongoose.connection;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.error("🔍 Please check your MongoDB URI and network connection");
    throw error; // Throw error so server can handle it
  }
}

// Close MongoDB connection
async function closeDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed");
    }
  } catch (error) {
    console.error("❌ Error closing MongoDB connection:", error);
    throw error;
  }
}

// Get connection status
function getConnectionStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = {
  connectDB,
  closeDB,
  getConnectionStatus,
  mongoose
};

