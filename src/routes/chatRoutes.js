const express = require('express');
const router = express.Router();
const { 
    handleCreatePrivateChat, 
    handleCreateGroupChat,
    handleSendMessage,
    getUserChats,
    getChatMessages
} = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/private', handleCreatePrivateChat);
router.post('/group', handleCreateGroupChat);
router.post('/message', handleSendMessage);

router.get('/my', (req, res) => {
    req.params.userId = req.user.id;
    return getUserChats(req, res);
});

router.get('/user/:userId', async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Доступ запрещен' });
    }
    return getUserChats(req, res);
});

router.get('/:chatId/messages', getChatMessages);

router.post('/:chatId/read', async (req, res) => {
    try {
        const chatId = req.params.chatId;
        const userId = req.user.id;

        const Chat = require('../models/Chat');
        const chat = await Chat.findById(chatId);
        
        if (!chat) {
            return res.status(404).json({ message: 'Чат не найден' });
        }
        
        if (!chat.hasMember(userId)) {
            return res.status(403).json({ message: 'У вас нет доступа к этому чату' });
        }
        
        await chat.markAsRead(userId);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

router.put('/:chatId/archive', async (req, res) => {
    try {
        const chatId = req.params.chatId;
        const userId = req.user.id;

        const Chat = require('../models/Chat');
        const chat = await Chat.findById(chatId);
        
        if (!chat) {
            return res.status(404).json({ message: 'Чат не найден' });
        }
        
        const userMetaIndex = chat.userMetadata.findIndex(
            meta => meta.user.toString() === userId.toString()
        );
        
        if (userMetaIndex >= 0) {
            chat.userMetadata[userMetaIndex].status = 'archived';
        } else {
            chat.userMetadata.push({
                user: userId,
                status: 'archived',
                unreadCount: 0
            });
        }
        
        await chat.save();
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error archiving chat:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

module.exports = router;