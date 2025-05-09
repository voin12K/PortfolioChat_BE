const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const { createMessage } = require('./controllers/chatController');
const Chat = require('./models/Chat');
const jwt = require('jsonwebtoken');

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = 'mongodb+srv://vladleurda02:ree1IndvHO3ZPgOs@main.n0hck.mongodb.net/test?retryWrites=true&w=majority&appName=main';

if (!MONGO_URI) {
  console.error('MongoDB connection string missing! Set MONGO_URI environment variable');
  process.exit(1);
}

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

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
};

io.use(socketAuthMiddleware);

const activeUsers = new Map();

io.on('connection', (socket) => {
  if (socket.user?.id) {
    activeUsers.set(socket.user.id, socket.id);
    io.emit('userStatus', { userId: socket.user.id, status: 'online' });
  }

  socket.on('joinChat', async (chatId) => {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        users: socket.user.id
      });
      
      if (!chat) {
        socket.emit('error', { message: 'Access to chat denied' });
        return;
      }
      
      socket.join(chatId);
      await chat.markAsRead(socket.user.id);
      socket.to(chatId).emit('userJoined', { userId: socket.user.id, chatId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  socket.on('leaveChat', (chatId) => {
    socket.leave(chatId);
    socket.to(chatId).emit('userLeft', { userId: socket.user.id, chatId });
  });

  socket.on('sendMessage', async ({ chatId, content, messageType = 'text', attachments = [] }, callback) => {
    try {
      if (!socket.user) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }
      
      if (!content || content.trim() === '') {
        socket.emit('error', { message: 'Message content cannot be empty' });
        return;
      }
      
      const newMessage = await createMessage(chatId, socket.user.id, content, messageType, attachments);
      io.to(chatId).emit('newMessage', newMessage);
      
      if (callback) callback({ success: true, messageId: newMessage._id });
    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
      if (callback) callback({ success: false, error: 'Failed to send message' });
    }
  });

  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(chatId).emit('userTyping', {
      userId: socket.user?.id,
      isTyping
    });
  });

  socket.on('markAsRead', async ({ chatId, messageId }) => {
    try {
      if (!socket.user) return;
      
      const chat = await Chat.findById(chatId);
      
      if (chat && chat.hasMember(socket.user.id)) {
        await chat.markAsRead(socket.user.id);
        io.to(chatId).emit('messageRead', {
          chatId,
          userId: socket.user.id,
          messageId
        });
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  });

  socket.on('disconnect', () => {
    if (socket.user?.id) {
      activeUsers.delete(socket.user.id);
      io.emit('userStatus', { userId: socket.user.id, status: 'offline' });
    }
  });
});

const gracefulShutdown = () => {
  server.close(() => {
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
  
  setTimeout(() => {
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});