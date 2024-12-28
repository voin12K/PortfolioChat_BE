const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    name: { type: String, default: '' },
    type: { type: String, enum: ['private', 'group'], default: 'private' },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessageDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });

chatSchema.index({ users: 1 });
chatSchema.index({ lastMessageDate: -1 });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
