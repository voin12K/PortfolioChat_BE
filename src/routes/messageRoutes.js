const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { limit = 50, before } = req.query;
        const userId = req.user.id;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Чат не найден' });
        }
        
        if (!chat.hasMember(userId)) {
            return res.status(403).json({ message: 'У вас нет доступа к этому чату' });
        }

        const query = { chat: chatId, 'deleted.isDeleted': { $ne: true } };
        
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .populate('sender', 'username name profileImage')
            .populate('replyTo')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .exec();

        await chat.markAsRead(userId);

        res.json(messages.reverse());
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { chatId, content, replyTo, messageType = 'text', attachments = [] } = req.body;
        const userId = req.user.id;

        if (!chatId || !content) {
            return res.status(400).json({ message: 'Необходимы ID чата и содержание сообщения' });
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Чат не найден' });
        }
        
        if (!chat.hasMember(userId)) {
            return res.status(403).json({ message: 'У вас нет доступа к этому чату' });
        }

        const newMessage = new Message({
            chat: chatId,
            sender: userId,
            content,
            messageType,
            attachments,
            replyTo: replyTo || null
        });

        await newMessage.save();

        chat.messages.push(newMessage._id);
        chat.lastMessage = newMessage._id;
        chat.lastMessageDate = new Date();
        
        chat.users.forEach(user => {
            if (user.toString() !== userId.toString()) {
                const userMeta = chat.userMetadata.find(
                    meta => meta.user.toString() === user.toString()
                );
                
                if (userMeta) {
                    userMeta.unreadCount += 1;
                } else {
                    chat.userMetadata.push({
                        user,
                        unreadCount: 1
                    });
                }
            }
        });
        
        await chat.save();

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'username name profileImage')
            .populate('replyTo');

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

router.put('/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content) {
            return res.status(400).json({ message: 'Содержимое сообщения не может быть пустым' });
        }

        const message = await Message.findById(messageId);
        
        if (!message) {
            return res.status(404).json({ message: 'Сообщение не найдено' });
        }
        
        if (message.sender.toString() !== userId) {
            return res.status(403).json({ message: 'У вас нет прав на редактирование этого сообщения' });
        }

        message.content = content;
        message.edited = {
            isEdited: true,
            editedAt: new Date()
        };
        
        await message.save();
        
        const updatedMessage = await Message.findById(messageId)
            .populate('sender', 'username name profileImage');
            
        res.json(updatedMessage);
    } catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

router.delete('/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        const message = await Message.findById(messageId);
        if (!message) {
            console.log('Message not found');
            return res.status(404).json({ message: 'Сообщение не найдено' });
        }

        const chat = await Chat.findById(message.chat);
        if (!chat) {
            console.log('Chat not found');
            return res.status(404).json({ message: 'Чат не найден' });
        }

        const isAdmin = chat && chat.isAdmin(userId);
        if (message.sender.toString() !== userId && !isAdmin) {
            return res.status(403).json({ message: 'У вас нет прав на удаление этого сообщения' });
        }


        const deletedMessage = await Message.findByIdAndDelete(messageId);


        if (req.io && chat._id) {
            req.io.to(chat._id).emit("messageDeleted", { messageId });
        } else {
            console.log('WebSocket or Chat ID is not properly configured');
        }

        res.json({ success: true, message: 'Сообщение удалено' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

module.exports = router;
