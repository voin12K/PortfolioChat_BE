const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    name: { type: String, default: '' },
    type: { type: String, enum: ['private', 'group'], default: 'private' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    description: { type: String, default: '' },
    avatar: { type: String, default: '' },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessageDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    userMetadata: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        unreadCount: { type: Number, default: 0 },
        status: { type: String, enum: ['active', 'archived', 'muted'], default: 'active' },
        lastReadMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
    }]
}, { timestamps: true });

chatSchema.pre('save', function(next) {
    if (this.messages && this.messages.length > 100) {
        this.messages = this.messages.slice(-100);
    }
    next();
});

chatSchema.pre('validate', function(next) {
    if (this.type === 'group') {
        if (!this.name || this.name.trim() === '') {
            this.invalidate('name', 'Group chats must have a name');
        }
        if (!this.users || this.users.length < 2) {
            this.invalidate('users', 'Group chats must have at least 2 users');
        }
    }
    next();
});

chatSchema.methods.hasMember = function(userId) {
    return this.users.some(id => id.toString() === userId.toString());
};

chatSchema.methods.isAdmin = function(userId) {
    if (this.type !== 'group') return false;
    return this.admins.some(id => id.toString() === userId.toString());
};

chatSchema.methods.markAsRead = async function(userId) {
    const userMeta = this.userMetadata.find(meta => 
        meta.user.toString() === userId.toString()
    );
    
    if (userMeta) {
        userMeta.unreadCount = 0;
        if (this.lastMessage) {
            userMeta.lastReadMessage = this.lastMessage;
        }
    } else {
        this.userMetadata.push({
            user: userId,
            unreadCount: 0,
            lastReadMessage: this.lastMessage,
            status: 'active'
        });
    }
    
    return this.save();
};

chatSchema.index({ users: 1 });
chatSchema.index({ lastMessageDate: -1 });
chatSchema.index({ 'userMetadata.user': 1 });
chatSchema.index({ 'userMetadata.status': 1 });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
