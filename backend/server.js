require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const deviceRoutes = require('./routes/deviceRoutes');
const userRoutes = require('./routes/userRoutes');
const networkScanner = require('./services/networkScannerService');

const app = express();
app.disable('x-powered-by');
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(v => v.trim()) : true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/', (req, res) => res.status(200).json({
  status: 'success',
  service: 'ISP Cloud Monitoring API',
  version: '2.0.0',
  timestamp: new Date().toISOString()
}));
app.get('/health', (req, res) => res.status(200).json({
  status: 'ok',
  database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected'
}));

app.use('/api/devices', deviceRoutes);
app.use('/api/users', userRoutes);
app.post('/api/scan', async (req, res, next) => {
  try {
    const result = await networkScanner.scanAllDevices();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => res.status(404).json({
  status: 'fail',
  message: `Cannot find endpoint [${req.method} ${req.originalUrl}]`
}));
app.use((err, req, res, next) => {
  console.error('API error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { errorDetails: err.stack } : {})
  });
});

const PORT = Number(process.env.PORT) || 5000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`ISP Cloud API listening on port ${PORT}`)))
  .catch(error => {
    console.error('Startup failed:', error.message);
    process.exit(1);
  });

module.exports = app;
