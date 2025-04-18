const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Helper function to create or find a private chat between two users
 */
const createChat = async (userId1, userId2) => {
    try {
        // Validate user IDs
        if (!mongoose.Types.ObjectId.isValid(userId1) || !mongoose.Types.ObjectId.isValid(userId2)) {
            throw new Error('Invalid user ID format');
        }
        
        const existingChat = await Chat.findOne({
            users: { $all: [userId1, userId2] },
            type: 'private'
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

/**
 * Helper function to create a message
 */
const createMessage = async (chatId, senderId, content) => {
    try {
        // Input validation
        if (!content || !content.trim()) {
            throw new Error('Message content cannot be empty');
        }

        const newMessage = new Message({
            chat: chatId,
            sender: senderId,
            content: content.trim(),
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
        throw new Error('Chat update failed');
    }
};

/**
 * HTTP handler for creating or finding private chat
 */
const handleCreatePrivateChat = async (req, res) => {
    try {
        const { userId1, userId2 } = req.body;
        
        if (!userId1 || !userId2) {
            return res.status(400).json({ message: 'Both user IDs are required' });
        }

        const chat = await createChat(userId1, userId2);
        
        // Populate user info before returning
        const populatedChat = await Chat.findById(chat._id)
            .populate('users', 'name username profileImage');
        
        res.status(201).json(populatedChat);
    } catch (error) {
        console.error('Error handling chat creation:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

/**
 * Create a group chat with multiple users
 */
const handleCreateGroupChat = async (req, res) => {
    try {
        const { name, userIds } = req.body;
        const creatorId = req.user?.id; // Assuming auth middleware
        
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Group name is required' });
        }
        
        if (!Array.isArray(userIds) || userIds.length < 2) {
            return res.status(400).json({ message: 'At least 2 users are required' });
        }

        // Create the group chat
        const newGroupChat = new Chat({
            name: name.trim(),
            users: userIds,
            type: 'group',
            createdBy: creatorId
        });

        await newGroupChat.save();
        
        const populatedChat = await Chat.findById(newGroupChat._id)
            .populate('users', 'name username profileImage');
            
        res.status(201).json(populatedChat);
    } catch (error) {
        console.error('Error creating group chat:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * HTTP handler for sending messages
 */
const handleSendMessage = async (req, res) => {
    try {
        const { chatId, senderId, content } = req.body;
        
        if (!chatId || !senderId || !content) {
            return res.status(400).json({ message: 'Chat ID, sender ID, and content are required' });
        }

        // Check if user is part of the chat
        const chat = await Chat.findOne({
            _id: chatId,
            users: senderId
        });
        
        if (!chat) {
            return res.status(403).json({ message: 'User is not part of this chat' });
        }

        const message = await createMessage(chatId, senderId, content);
        
        // Populate sender info before returning
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name username profileImage');
            
        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('Error handling message creation:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

/**
 * Get all chats for a user
 */
const getUserChats = async (req, res) => {
    try {
        const userId = req.params.userId;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        const chats = await Chat.find({ 
            users: userId,
            status: { $ne: 'archived' }
        })
        .populate('users', 'name username profileImage')
        .populate('lastMessage')
        .sort({ lastMessageDate: -1 });
        
        res.status(200).json(chats);
    } catch (error) {
        console.error('Error fetching user chats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Get chat messages
 */
const getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { limit = 50, page = 1 } = req.query;
        
        const skip = (page - 1) * limit;
        
        const messages = await Message.find({ chat: chatId })
            .populate('sender', 'name username profileImage')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
            
        res.status(200).json(messages.reverse()); // Reverse to get chronological order
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { 
    // Original helper functions 
    createChat, 
    createMessage,
    updateChatWithNewMessage,
    
    // New HTTP handlers
    handleCreatePrivateChat,
    handleCreateGroupChat,
    handleSendMessage,
    getUserChats,
    getChatMessages
};