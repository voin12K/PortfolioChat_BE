const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/:chatId', authMiddleware, async (req, res) => {
    const { chatId } = req.params;

    try {
        const messages = await Message.find({ chat: chatId })
            .populate('sender', 'username profileImage')
            .sort({ createdAt: 1 }); 
        
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const { chatId, senderId, content } = req.body;

    if (!chatId || !senderId || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const newMessage = new Message({
            chat: chatId,
            sender: senderId,
            content
        });

        await newMessage.save();

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
