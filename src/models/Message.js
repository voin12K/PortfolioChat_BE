const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'video', 'file', 'audio', 'location', 'system'],
        default: 'text'
    },
    attachments: [{
        filename: String,
        fileType: String,
        url: String,
        size: Number,
        thumbnailUrl: String
    }],
    systemMessageType: {
        type: String,
        enum: ['userJoined', 'userLeft', 'groupCreated', 'groupRenamed', 'userAdded', 'userRemoved'],
        default: null
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },
    readBy: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now }
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    edited: {
        isEdited: { type: Boolean, default: false },
        editedAt: Date
    },
    deleted: {
        isDeleted: { type: Boolean, default: false },
        deletedAt: Date
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

messageSchema.virtual('isVisible').get(function() {
    return !this.deleted.isDeleted;
});

messageSchema.methods.markAsReadBy = function(userId) {
    const alreadyRead = this.readBy.some(r => r.user.toString() === userId.toString());
    
    if (!alreadyRead) {
        this.readBy.push({
            user: userId,
            readAt: new Date()
        });
        
        if (this.status !== 'read') {
            this.status = 'read';
        }
    }
    
    return this;
};

messageSchema.statics.findVisibleInChat = function(chatId, options = {}) {
    const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
    
    return this.find({
        chat: chatId,
        'deleted.isDeleted': { $ne: true }
    })
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
