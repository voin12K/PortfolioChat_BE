const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

app.use(express.json());
console.log('authRoutes:', authRoutes);
console.log('userRoutes:', userRoutes);

app.use('/api', userRoutes);
app.use('/api/auth', authRoutes);

module.exports = app;
