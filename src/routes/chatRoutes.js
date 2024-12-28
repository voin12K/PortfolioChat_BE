const express = require('express');
const router = express.Router();
const { createChat, createMessage } = require('../controllers/chatController');

router.post('/create', async (req, res) => {
    const { userId1, userId2 } = req.body;

    try {
        const chat = await createChat(userId1, userId2);
        res.status(200).json(chat);
    } catch (error) {
        res.status(500).json({ message: 'Error creating chat' });
    }
});

router.post('/message', async (req, res) => {
    const { chatId, senderId, content } = req.body;

    try {
        const message = await createMessage(chatId, senderId, content);
        res.status(200).json(message);
    } catch (error) {
        res.status(500).json({ message: 'Error creating message' });
    }
});

module.exports = router;
