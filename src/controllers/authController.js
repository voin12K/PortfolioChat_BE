const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const errors = {};

        if (!email) errors.email = 'Email is required';
        if (!password) errors.password = 'Password is required';

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ errors });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ errors: { email: 'User not found' } });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ errors: { password: 'Invalid password' } });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET || 'defaultsecret',
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error in login controller:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { register, login };
