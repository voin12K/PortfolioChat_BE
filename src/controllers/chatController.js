const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

const createChat = async (userId1, userId2) => {
    try {
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

const createMessage = async (chatId, senderId, content, messageType = 'text', attachments = [], replyTo = null) => {
    try {
        if (!content || !content.trim()) {
            throw new Error('Message content cannot be empty');
        }

        let replyToMessage = null;
        if (replyTo) {
            replyToMessage = await Message.findById(replyTo);
            if (!replyToMessage) {
                throw new Error('Reply-to message not found');
            }
        }

        const newMessage = new Message({
            chat: chatId,
            sender: senderId,
            content: content.trim(),
            replyTo: replyToMessage ? replyToMessage._id : null,
            messageType,
            attachments,
        });

        await newMessage.save();

        await updateChatWithNewMessage(chatId, newMessage._id);

        return await Message.findById(newMessage._id)
            .populate('sender', 'username _id')
            .populate('replyTo', 'content sender');
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

const handleCreatePrivateChat = async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;

    if (!userId1 || !userId2) {
      return res.status(400).json({ message: 'Both user IDs are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId1) || !mongoose.Types.ObjectId.isValid(userId2)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const usersExist = await User.countDocuments({ _id: { $in: [userId1, userId2] } }) === 2;
    if (!usersExist) {
      return res.status(404).json({ message: 'One or both users not found' });
    }

    const existingChat = await Chat.findOne({
      isGroup: false,
      users: { $all: [userId1, userId2] },
      $expr: { $eq: [{ $size: "$users" }, 2] }
    });

    if (existingChat) {
      return res.json(existingChat);
    }

    const newChat = new Chat({
      isGroup: false,
      users: [userId1, userId2].sort(),
      userMetadata: [
        { user: userId1, status: 'active' },
        { user: userId2, status: 'active' }
      ]
    });

    await newChat.save();
    res.status(201).json(newChat);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const handleCreateGroupChat = async (req, res) => {
    try {
        const { name, userIds } = req.body;
        const creatorId = req.user?.id; 
        
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Group name is required' });
        }
        
        if (!Array.isArray(userIds) || userIds.length < 2) {
            return res.status(400).json({ message: 'At least 2 users are required' });
        }

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

const handleSendMessage = async (req, res) => {
    try {
        const { chatId, senderId, content } = req.body;
        
        if (!chatId || !senderId || !content) {
            return res.status(400).json({ message: 'Chat ID, sender ID, and content are required' });
        }

        const chat = await Chat.findOne({
            _id: chatId,
            users: senderId
        });
        
        if (!chat) {
            return res.status(403).json({ message: 'User is not part of this chat' });
        }

        const message = await createMessage(chatId, senderId, content);
        
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name username profileImage');
            
        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('Error handling message creation:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

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

const getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { limit = 500, page = 1 } = req.query;

        const skip = (page - 1) * limit;

        const chat = await Chat.findById(chatId)
            .populate({
                path: 'messages',
                options: {
                    sort: { createdAt: 1 },
                    skip: skip,
                    limit: Number(limit),
                },
                populate: [
                    { path: 'sender', select: 'name username profileImage' },
                    { path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'username' } }, 
                ],
            });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        res.status(200).json(chat.messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { 
    createChat, 
    createMessage,
    updateChatWithNewMessage,
    
    handleCreatePrivateChat,
    handleCreateGroupChat,
    handleSendMessage,
    getUserChats,
    getChatMessages
};