const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const socketIo = require('socket.io');

const PORT = 5000;
const MONGO_URI = 'mongodb+srv://vladleurda02:ree1IndvHO3ZPgOs@main.n0hck.mongodb.net/?retryWrites=true&w=majority&appName=main';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

connectDB();

const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",  
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('joinChat', (chatId) => {
        socket.join(chatId);  
        console.log(`User joined chat: ${chatId}`);
    });

    socket.on('sendMessage', async ({ chatId, senderId, content }) => {
        try {
            const newMessage = await createMessage(chatId, senderId, content);
            io.to(chatId).emit('newMessage', newMessage);
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
