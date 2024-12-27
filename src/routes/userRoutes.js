const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/users', async (req, res) => {
    const { username } = req.query;

    if (!username || username.trim().length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    try {
        const users = await User.find({
            username: { $regex: username, $options: 'i' }
        })
        .limit(10)
        .select('username email profileImage description');

        if (users.length === 0) {
            return res.status(404).json({ error: 'No users found' });
        }

        res.json(users);
    } catch (error) {
        console.error('Error searching users:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
