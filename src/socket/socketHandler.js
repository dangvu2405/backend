const jwt = require('jsonwebtoken');
const { ChatRoom, ChatMessage } = require('../app/models/Chat');
const TaiKhoan = require('../app/models/Taikhoan');

/**
 * ============================================
 * 💬 SOCKET.IO HANDLER
 * ============================================
 */

// Lưu trữ user socket connections
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> { userId, userType, chatRoomId }

/**
 * Authenticate socket connection
 */
async function authenticateSocket(socket, next) {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
        
        if (!token) {
            return next(new Error('Không có token xác thực'));
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await TaiKhoan.findById(decoded.id)
            .select('-MatKhau -DiaChi')
            .populate('MaVaiTro', 'TenVaiTro MoTa');

        if (!user || user.TrangThai !== 'active') {
            return next(new Error('Người dùng không hợp lệ hoặc đã bị khóa'));
        }

        // Lưu thông tin user vào socket
        socket.user = {
            id: user._id.toString(),
            email: user.Email,
            name: user.HoTen,
            avatar: user.AvatarUrl,
            role: user.MaVaiTro?.TenVaiTro?.toLowerCase()
        };

        socket.userType = socket.user.role === 'admin' || socket.user.role === 'quản trị viên' ? 'admin' : 'customer';

        next();
    } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Token không hợp lệ'));
    }
}

/**
 * Initialize Socket.IO handlers
 */
function initializeSocket(io) {
    // Middleware để xác thực socket connections
    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        const userId = socket.user.id;
        const userType = socket.userType;

        console.log(`🔌 User connected: ${socket.user.name} (${userType}) - Socket ID: ${socket.id}`);

        // Lưu socket connection
        userSockets.set(userId, socket.id);
        socketUsers.set(socket.id, {
            userId,
            userType,
            chatRoomId: null
        });

        // Join user vào room riêng để nhận tin nhắn
        socket.join(`user:${userId}`);

        // Nếu là admin, join vào admin room
        if (userType === 'admin') {
            socket.join('admin-room');
            console.log(`👨‍💼 Admin joined admin-room`);
        }

        /**
         * Join chat room
         */
        socket.on('join-chat-room', async (data) => {
            try {
                const { chatRoomId } = data;

                // Kiểm tra quyền truy cập
                const chatRoom = await ChatRoom.findById(chatRoomId);
                if (!chatRoom) {
                    socket.emit('error', { message: 'Chat room không tồn tại' });
                    return;
                }

                const isAdmin = userType === 'admin';
                const hasAccess = isAdmin || chatRoom.CustomerId.toString() === userId;

                if (!hasAccess) {
                    socket.emit('error', { message: 'Bạn không có quyền truy cập chat room này' });
                    return;
                }

                // Leave room cũ nếu có
                const oldData = socketUsers.get(socket.id);
                if (oldData?.chatRoomId) {
                    socket.leave(`chat-room:${oldData.chatRoomId}`);
                }

                // Join room mới
                socket.join(`chat-room:${chatRoomId}`);
                socketUsers.set(socket.id, {
                    userId,
                    userType,
                    chatRoomId
                });

                // Thông báo cho các user khác trong room
                socket.to(`chat-room:${chatRoomId}`).emit('user-joined', {
                    userId,
                    userName: socket.user.name,
                    userType
                });

                console.log(`✅ User ${socket.user.name} joined chat room ${chatRoomId}`);
            } catch (error) {
                console.error('Error joining chat room:', error);
                socket.emit('error', { message: 'Lỗi khi tham gia chat room' });
            }
        });

        /**
         * Send message
         */
        socket.on('send-message', async (data) => {
            try {
                const { chatRoomId, message } = data;

                if (!chatRoomId || !message || message.trim().length === 0) {
                    socket.emit('error', { message: 'Thông tin không hợp lệ' });
                    return;
                }

                // Kiểm tra quyền truy cập
                const chatRoom = await ChatRoom.findById(chatRoomId);
                if (!chatRoom) {
                    socket.emit('error', { message: 'Chat room không tồn tại' });
                    return;
                }

                const isAdmin = userType === 'admin';
                const hasAccess = isAdmin || chatRoom.CustomerId.toString() === userId;

                if (!hasAccess) {
                    socket.emit('error', { message: 'Bạn không có quyền gửi tin nhắn trong chat room này' });
                    return;
                }

                // Tạo tin nhắn mới
                const newMessage = await ChatMessage.create({
                    ChatRoomId: chatRoomId,
                    SenderId: userId,
                    SenderType: userType,
                    Message: message.trim(),
                    IsRead: false
                });

                await newMessage.populate('SenderId', 'HoTen Email AvatarUrl');

                // Cập nhật chat room
                chatRoom.LastMessage = message.trim();
                chatRoom.LastMessageAt = new Date();

                // Cập nhật unread count
                if (userType === 'admin') {
                    chatRoom.UnreadCount.customer += 1;
                } else {
                    chatRoom.UnreadCount.admin += 1;
                    // Tự động chuyển status thành active nếu customer gửi tin nhắn
                    if (chatRoom.Status === 'pending') {
                        chatRoom.Status = 'active';
                    }
                }

                await chatRoom.save();

                // Gửi tin nhắn đến tất cả user trong room
                const messageData = {
                    _id: newMessage._id,
                    ChatRoomId: chatRoomId,
                    SenderId: {
                        _id: socket.user.id,
                        HoTen: socket.user.name,
                        Email: socket.user.email,
                        AvatarUrl: socket.user.avatar
                    },
                    SenderType: userType,
                    Message: message.trim(),
                    IsRead: false,
                    createdAt: newMessage.createdAt,
                    updatedAt: newMessage.updatedAt
                };

                io.to(`chat-room:${chatRoomId}`).emit('new-message', messageData);

                // Thông báo cho admin về tin nhắn mới (nếu customer gửi)
                if (userType === 'customer') {
                    io.to('admin-room').emit('new-chat-message', {
                        chatRoomId,
                        message: messageData,
                        unreadCount: chatRoom.UnreadCount.admin
                    });
                } else {
                    // Thông báo cho customer
                    const customerSocketId = userSockets.get(chatRoom.CustomerId.toString());
                    if (customerSocketId) {
                        io.to(`user:${chatRoom.CustomerId}`).emit('new-chat-message', {
                            chatRoomId,
                            message: messageData,
                            unreadCount: chatRoom.UnreadCount.customer
                        });
                    }
                }

                console.log(`💬 Message sent in room ${chatRoomId} by ${socket.user.name}`);
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Lỗi khi gửi tin nhắn' });
            }
        });

        /**
         * Mark messages as read
         */
        socket.on('mark-as-read', async (data) => {
            try {
                const { chatRoomId } = data;

                const chatRoom = await ChatRoom.findById(chatRoomId);
                if (!chatRoom) {
                    return;
                }

                const oppositeSenderType = userType === 'admin' ? 'customer' : 'admin';

                // Đánh dấu các tin nhắn chưa đọc từ người kia là đã đọc
                await ChatMessage.updateMany(
                    {
                        ChatRoomId: chatRoomId,
                        SenderType: oppositeSenderType,
                        IsRead: false
                    },
                    {
                        IsRead: true,
                        ReadAt: new Date()
                    }
                );

                // Cập nhật unread count
                if (userType === 'admin') {
                    chatRoom.UnreadCount.admin = 0;
                } else {
                    chatRoom.UnreadCount.customer = 0;
                }
                await chatRoom.save();

                // Thông báo cho user kia
                socket.to(`chat-room:${chatRoomId}`).emit('messages-read', {
                    chatRoomId,
                    readBy: userId
                });
            } catch (error) {
                console.error('Error marking as read:', error);
            }
        });

        /**
         * Leave chat room
         */
        socket.on('leave-chat-room', (data) => {
            const { chatRoomId } = data;
            socket.leave(`chat-room:${chatRoomId}`);
            socketUsers.set(socket.id, {
                userId,
                userType,
                chatRoomId: null
            });
            console.log(`👋 User ${socket.user.name} left chat room ${chatRoomId}`);
        });

        /**
         * Disconnect
         */
        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${socket.user.name} - Socket ID: ${socket.id}`);
            userSockets.delete(userId);
            socketUsers.delete(socket.id);
        });
    });
}

module.exports = { initializeSocket };

