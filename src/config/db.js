const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const dbURI = 'mongodb+srv://vladleurda02:ree1IndvHO3ZPgOs@main.n0hck.mongodb.net/test?retryWrites=true&w=majority&appName=main';
        await mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
