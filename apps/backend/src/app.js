const express = require('express');
const cors = require('cors');
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const employeeRoutes = require('./modules/employees/employee.routes');
const productRoutes = require('./modules/products/product.routes');
const stockRoutes = require('./modules/stock/stock.routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date()
  });
});

// API Routes mounting
app.use('/v1/auth', authRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/admin/employees', employeeRoutes);
app.use('/v1/products', productRoutes);
app.use('/v1/stock', stockRoutes);

// 404 Route handler
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.status = 404;
  error.code = 'NOT_FOUND';
  next(error);
});

// Centralized Error handler
app.use(errorHandler);

module.exports = app;
