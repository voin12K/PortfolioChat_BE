const User = require('../models/User');
const jwt = require('jsonwebtoken'); 


const registerUser = async (name, username, description, profileImage, email, password) => {
    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new Error('User already exists with this email');
    }

    const user = new User({
        name,
        username,
        description,
        profileImage,
        email,
        password
    });

    await user.save();
    return user;
};


const loginUser = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('Invalid email or password');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    const token = jwt.sign({ userId: user._id }, '12345', { expiresIn: '30d' });
    return { user, token };
};

module.exports = { registerUser, loginUser };
