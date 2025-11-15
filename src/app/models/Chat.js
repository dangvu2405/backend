const mongoose = require('mongoose');

/**
 * ============================================
 * 💬 CHAT MESSAGE SCHEMA
 * ============================================
 */
const ChatMessageSchema = new mongoose.Schema({
    ChatRoomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom',
        required: [true, 'Chat room ID là bắt buộc']
    },
    SenderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Taikhoan',
        required: [true, 'Sender ID là bắt buộc']
    },
    SenderType: {
        type: String,
        enum: ['customer', 'admin'],
        required: [true, 'Sender type là bắt buộc']
    },
    Message: {
        type: String,
        required: [true, 'Nội dung tin nhắn là bắt buộc'],
        trim: true,
        maxlength: [2000, 'Tin nhắn không được quá 2000 ký tự']
    },
    IsRead: {
        type: Boolean,
        default: false
    },
    ReadAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    collection: 'ChatMessage'
});

/**
 * ============================================
 * 💬 CHAT ROOM SCHEMA
 * ============================================
 */
const ChatRoomSchema = new mongoose.Schema({
    CustomerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Taikhoan',
        required: [true, 'Customer ID là bắt buộc']
    },
    AdminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Taikhoan',
        default: null
    },
    Status: {
        type: String,
        enum: ['active', 'closed', 'pending'],
        default: 'pending' // pending: chờ admin phản hồi, active: đang chat, closed: đã đóng
    },
    LastMessage: {
        type: String,
        default: null
    },
    LastMessageAt: {
        type: Date,
        default: null
    },
    UnreadCount: {
        customer: {
            type: Number,
            default: 0
        },
        admin: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true,
    collection: 'ChatRoom'
});

// Indexes
ChatRoomSchema.index({ CustomerId: 1 });
ChatRoomSchema.index({ AdminId: 1 });
ChatRoomSchema.index({ Status: 1 });
ChatMessageSchema.index({ ChatRoomId: 1, createdAt: -1 });
ChatMessageSchema.index({ SenderId: 1 });

const ChatRoom = mongoose.model('ChatRoom', ChatRoomSchema);
const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);

module.exports = {
    ChatRoom,
    ChatMessage
};

