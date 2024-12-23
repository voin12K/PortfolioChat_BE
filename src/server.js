const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const app = require('./app');
const connectDB = require('./config/db');  // Убедитесь, что путь правильный

app.use(cors({ origin: "*" }));

// Подключение к базе данных
connectDB();

const server = http.createServer(app);

const io = new Server(server);

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(5000, () => {
    console.log("Server is running on port 5000");
});
