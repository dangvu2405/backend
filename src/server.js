// backend/src/server.js - API Server
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const mongooseDB = require('./config/db/mongoose');
const authMiddleware = require('./app/middlewares/auth.middleware');
const responseTimeMiddleware = require('./app/middlewares/responseTime.middleware');
const { passport } = require('./config/passport');
const { initializeSocket } = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

// ============================================
// 🌐 CORS Configuration
// ============================================
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://dtv2405.id.vn',
    'https://www.dtv2405.id.vn',
    'https://backend-api.onrender.com',
    'https://api.dtv2405.id.vn',
    process.env.FRONTEND_URL,
    // Render URLs (fallback nếu custom domain chưa hoạt động)
    process.env.RENDER_EXTERNAL_URL, // Render tự động set biến này
    process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : null
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        // Check if origin is allowed
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
// ============================================
// Middleware Configuration
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Response Time Tracking - Must be before morgan
app.use(responseTimeMiddleware);

// Custom Morgan format with response time
morgan.token('response-time-color', (req, res) => {
    // morgan's :response-time is in seconds, convert to ms
    const timeMs = res.responseTime || (parseFloat(res['response-time']) * 1000) || 0;
    if (timeMs < 100) return `\x1b[32m${Math.round(timeMs)}ms\x1b[0m`; // Green for fast
    if (timeMs < 500) return `\x1b[33m${Math.round(timeMs)}ms\x1b[0m`; // Yellow for medium
    if (timeMs < 1000) return `\x1b[35m${Math.round(timeMs)}ms\x1b[0m`; // Magenta for slow
    return `\x1b[31m${Math.round(timeMs)}ms\x1b[0m`; // Red for very slow
});

// Custom format: Method URL Status ResponseTime Size
// Format: GET /api/products 200 45ms 1234
const customFormat = ':method :url :status :response-time-color :res[content-length]';
app.use(morgan(customFormat));

// Session configuration for Passport
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from uploads directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(authMiddleware);
// ============================================
// API Routes
// ============================================
const router = require('./routes/index');
router(app);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'API endpoint not found' 
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// Start Server
// ============================================
async function startServer() {
    try {
        console.log('🔄 Starting Backend API Server...');
        // Connect to MongoDB using Mongoose
        try {
            await mongooseDB.connectDB();
            console.log('✅ Database connection established');
        } catch (dbError) {
            console.error('❌ MongoDB connection failed:', dbError.message);
            console.warn('⚠️  Server will continue but database operations will fail');
            console.warn('💡 Tip: Check your MongoDB URI and network connection');
            // Don't exit - let server start but queries will fail
        }
        // Initialize Socket.IO
        const io = new Server(server, {
            cors: {
                origin: allowedOrigins,
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        // Initialize Socket.IO handlers
        initializeSocket(io);
        console.log('✅ Socket.IO initialized');

        // Start the server
        server.listen(port, () => {
            console.log(`✅ Backend API Server is running on http://localhost:${port}`);
            console.log(`✅ Socket.IO server is running on ws://localhost:${port}`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${port} is already in use`);
                console.error(`💡 Run: npm run kill:port (or node scripts/killPort.js ${port})`);
                console.error(`💡 Or find and kill the process manually`);
            } else {
                console.error('❌ Server error:', err);
            }
            process.exit(1);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;

