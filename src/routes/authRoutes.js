const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { protectedRouteHandler, register, login } = require('../controllers/authController');
const User = require('../models/User');

router.get('/protected', authMiddleware, protectedRouteHandler);

router.post('/register', register);

router.post('/login', login);

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'user not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('error /auth/me:', err);
        res.status(500).json({ error: 'error' });
    }
});

module.exports = router;
