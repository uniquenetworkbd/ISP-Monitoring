/**
 * ============================================================================
 * ISP MONITORING SYSTEM - DATABASE CONFIGURATION MODULE
 * Description: Handles secure connection pooling with MongoDB Atlas Cloud
 * ============================================================================
 */

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Cloud Connected Successfully: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Database Connection Failed: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
