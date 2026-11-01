/**
 * ============================================================================
 * ISP MONITORING SYSTEM - BACKEND CLOUD SERVER ENTRY POINT
 * Framework: Node.js & Express.js
 * Architecture: 3-Tier Enterprise Cloud Setup
 * ============================================================================
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Initialize Express App
const app = express();

// Middleware Configuration
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Environment Variables Configuration
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Database Connection Setup (MongoDB Cloud)
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ Connected successfully to Cloud Database (MongoDB Atlas)');
})
.catch((err) => {
    console.error('❌ Cloud Database Connection Error:', err.message);
    process.exit(1);
});

// Base Route / Health Check
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'ISP Cloud Monitoring Backend API is running live!',
        version: '2.0.0',
        timestamp: new Date()
    });
});

// Import and Register API Routes (Placeholder for subsequent files)
// const deviceRoutes = require('./routes/deviceRoutes');
// const userRoutes = require('./routes/userRoutes');
// app.use('/api/devices', deviceRoutes);
// app.use('/api/users', userRoutes);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
        errorDetails: err.message
    });
});

// Start Cloud Server
app.listen(PORT, () => {
    console.log(`🚀 ISP Cloud Server is running live on port ${PORT}`);
});
