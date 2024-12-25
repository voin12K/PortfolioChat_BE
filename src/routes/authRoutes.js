const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { protectedRouteHandler, register, login } = require('../controllers/authController');

router.get('/protected', authMiddleware, protectedRouteHandler);

router.post('/register', register);

router.post('/login', login);

module.exports = router;
