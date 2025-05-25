const express = require('express');
const app = express();
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const cors = require('cors');

const allowedOrigins = [
  'https://portfolio-chat-fe-mu.vercel.app',
  'https://portfolio-chat-fe-7si8.vercel.app', // добавь все нужные фронтенды
  'http://localhost:3000' // если локально тестируешь
];

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // для запросов без origin (Postman, curl)
    if (allowedOrigins.includes(origin)) {
      callback(null, origin);  // <- здесь вернуть origin, а не true!
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};


app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // для поддержки preflight запросов

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.send('API is running');
});

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
