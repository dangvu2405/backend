const express = require('express');
const router = express.Router();
const ChatController = require('../app/controllers/ChatController');
const adminMiddleware = require('../app/middlewares/admin.middleware');

// ============================================
// 💬 CHAT ROUTES
// ============================================

// Customer routes - không cần admin middleware
// GET /chat/room - Get or create chat room for customer
router.get('/room', ChatController.getOrCreateChatRoom);

// GET /chat/room/:chatRoomId - Get chat room by ID
router.get('/room/:chatRoomId', ChatController.getChatRoomById);

// GET /chat/room/:chatRoomId/messages - Get messages for a chat room
router.get('/room/:chatRoomId/messages', ChatController.getMessages);

// POST /chat/room/:chatRoomId/read - Mark messages as read
router.post('/room/:chatRoomId/read', ChatController.markAsRead);

// Admin routes - cần admin middleware
// GET /chat/rooms - Get all chat rooms (admin only)
router.get('/rooms', adminMiddleware, ChatController.getChatRooms);

// POST /chat/room/:chatRoomId/assign - Assign admin to chat room
router.post('/room/:chatRoomId/assign', adminMiddleware, ChatController.assignAdmin);

// POST /chat/room/:chatRoomId/close - Close chat room (admin only)
router.post('/room/:chatRoomId/close', adminMiddleware, ChatController.closeChatRoom);

// DELETE /chat/room/:chatRoomId - Delete chat room (admin only)
router.delete('/room/:chatRoomId', adminMiddleware, ChatController.deleteChatRoom);

module.exports = router;

