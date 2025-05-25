const express = require('express');
const app = express();
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const cors = require('cors');

const corsOptions = {
    origin: [
        'http://localhost:3000',
        'https://portfolio-chat-1cm4jjrih-voin12ks-projects.vercel.app',
        'https://portfolio-chat-fe-mu.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true, 
};

app.use(helmet()); 
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.use((req, res, next) => {
    res.status(404).json({ message: 'Endpoint не найден' });
});
 
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'error'
    });
});

module.exports = app;