const Chat = require('../models/Chat');
const Message = require('../models/Message');

const createChat = async (userId1, userId2) => {
    try {
        const existingChat = await Chat.findOne({
            users: { $all: [userId1, userId2] }
        });

        if (existingChat) {
            return existingChat;
        }

        const newChat = new Chat({
            users: [userId1, userId2],
            type: 'private',
        });

        await newChat.save();
        return newChat;
    } catch (error) {
        console.error('Error creating chat:', error);
        throw new Error('Internal server error');
    }
};

const createMessage = async (chatId, senderId, content) => {
    try {
        const newMessage = new Message({
            chat: chatId,
            sender: senderId,
            content: content,
        });

        await newMessage.save();

        await updateChatWithNewMessage(chatId, newMessage._id);

        return newMessage;
    } catch (error) {
        console.error('Error creating message:', error);
        throw new Error('Internal server error');
    }
};

const updateChatWithNewMessage = async (chatId, messageId) => {
    try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw new Error('Chat not found');
        }

        chat.messages.push(messageId);
        chat.lastMessage = messageId;
        chat.lastMessageDate = new Date();

        await chat.save();
    } catch (error) {
        console.error('Error updating chat with new message:', error);
    }
};

module.exports = { createChat, createMessage };
