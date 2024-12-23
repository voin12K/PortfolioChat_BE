const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const app = require('./app');  

app.use(cors({ origin: "*" }));

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
