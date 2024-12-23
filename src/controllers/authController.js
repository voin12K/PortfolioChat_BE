const User = require('../models/User');

const register = async (req, res) => {
    try {
        const { name, username, email, password, description = '', profileImage = '' } = req.body;

        const errors = {};

        if (!name) errors.name = 'Name is required';
        if (!username) errors.username = 'Username is required';
        if (!email) errors.email = 'Email is required';
        if (!password) errors.password = 'Password is required';

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ errors });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ errors: { email: 'Email already exists' } });
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ errors: { username: 'Username already exists' } });
        }

        const newUser = new User({
            name,
            username,
            email,
            password,
            description,
            profileImage,
        });

        await newUser.save();

        res.status(201).json({ message: 'User registered successfully', user: newUser.toJSON() });
    } catch (error) {
        console.error('Error in register controller:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { register };
