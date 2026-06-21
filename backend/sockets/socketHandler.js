const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'studyswap_jwt_secret_key_2026_super_secure';

// In-memory mapping of active user IDs to their Socket instances
const activeUsers = new Map(); // userId -> Set of socket.id

module.exports = (io) => {
  const { supabaseClient } = require('../middleware/auth');
  const useSupabaseAuth = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    if (useSupabaseAuth && supabaseClient) {
      try {
        let payload = null;
        let isLocalJwt = false;

        try {
          payload = jwt.verify(token, JWT_SECRET);
          isLocalJwt = true;
        } catch (e) {
          // Proceed with Supabase check
        }

        if (isLocalJwt && payload) {
          const dbUser = await db.get('SELECT id, email, full_name, role FROM users WHERE id = ?', [payload.id]);
          if (dbUser) {
            socket.user = dbUser;
            return next();
          }
        }

        let user = null;
        let authError = null;
        try {
          const { data, error } = await supabaseClient.auth.getUser(token);
          user = data?.user;
          authError = error;
        } catch (err) {
          console.warn("Supabase Auth API socket fetch failed. Using local decode fallback...");
          try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.sub) {
              const dbUser = await db.get('SELECT id, email, full_name, role FROM users WHERE id = ?', [decoded.sub]);
              if (dbUser) {
                socket.user = dbUser;
                return next();
              }
            }
          } catch (e) {
            console.error("Socket local decode fallback failed:", e.message);
          }
          return next(new Error('Authentication error: Supabase Auth timed out'));
        }

        if (authError || !user) {
          return next(new Error('Authentication error: Invalid Supabase token'));
        }
        // Fetch matching database profile
        const dbUser = await db.get('SELECT id, email, full_name, role FROM users WHERE id = ?', [user.id]);
        if (!dbUser) {
          return next(new Error('Authentication error: User profile not synchronized'));
        }
        socket.user = dbUser;
        next();
      } catch (err) {
        return next(new Error('Authentication error: ' + err.message));
      }
    } else {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        return next(new Error('Authentication error: Invalid token'));
      }
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.user.id);
    
    // Register user socket
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId).add(socket.id);
    
    console.log(`User connected: ${userId} (${socket.user.email}) on socket: ${socket.id}`);

    // Join a specific task chat room
    socket.on('join_room', ({ taskId }) => {
      const room = `task_${taskId}`;
      socket.join(room);
      console.log(`User ${userId} joined room ${room}`);
    });

    // Leave a specific task chat room
    socket.on('leave_room', ({ taskId }) => {
      const room = `task_${taskId}`;
      socket.leave(room);
      console.log(`User ${userId} left room ${room}`);
    });

    // Handle incoming messages
    socket.on('send_message', async ({ taskId, receiverId, content, fileUrl, fileName }) => {
      try {
        // Check if there is an accepted bid on the task
        const acceptedBid = await db.get(
          `SELECT b.helper_id, t.client_id 
           FROM bids b 
           JOIN tasks t ON b.task_id = t.id 
           WHERE b.task_id = ? AND b.status = 'accepted'`,
          [taskId]
        );

        if (acceptedBid) {
          const hiredHelper = String(acceptedBid.helper_id);
          const taskOwner = String(acceptedBid.client_id);
          const currentSender = String(userId);
          const currentReceiver = String(receiverId);

          const isSenderAuthorized = (currentSender === hiredHelper || currentSender === taskOwner);
          const isReceiverAuthorized = (currentReceiver === hiredHelper || currentReceiver === taskOwner);

          if (!isSenderAuthorized || !isReceiverAuthorized) {
            socket.emit('error', { message: 'This task has been assigned to another helper. Chat is locked.' });
            return;
          }
        }

        // Save to Database
        const result = await db.run(
          `INSERT INTO messages (task_id, sender_id, receiver_id, content, file_url, file_name)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [taskId, userId, receiverId, content || null, fileUrl || null, fileName || null]
        );

        const newMessage = {
          id: result.lastInsertRowid,
          task_id: taskId,
          sender_id: userId,
          receiver_id: receiverId,
          content,
          file_url: fileUrl,
          file_name: fileName,
          is_read: 0,
          created_at: new Date().toISOString()
        };

        // Broadcast to receiver sockets directly
        const receiverSockets = activeUsers.get(String(receiverId));
        if (receiverSockets) {
          receiverSockets.forEach(socketId => {
            io.to(socketId).emit('new_message', newMessage);
          });
        }
        // Broadcast to sender (ourselves) sockets directly (for multi-device sync)
        const senderSockets = activeUsers.get(String(userId));
        if (senderSockets) {
          senderSockets.forEach(socketId => {
            io.to(socketId).emit('new_message', newMessage);
          });
        }

        // Also push standard in-app notifications to receiver if they are not in the room
        await sendRealtimeNotification(receiverId, {
          user_id: receiverId,
          title: 'New Message',
          message: `${socket.user.full_name}: ${content ? (content.substring(0, 40) + (content.length > 40 ? '...' : '')) : 'sent a file.'}`,
          type: 'message',
          created_at: new Date().toISOString()
        });

      } catch (err) {
        console.error('Socket message save failed:', err.message);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    // Handle typing indicators
    socket.on('typing', ({ taskId, receiverId, isTyping }) => {
      const receiverSockets = activeUsers.get(String(receiverId));
      if (receiverSockets) {
        receiverSockets.forEach(socketId => {
          io.to(socketId).emit('typing_status', { userId, isTyping });
        });
      }
    });

    // Handle marking messages as read
    socket.on('mark_read', async ({ taskId, senderId }) => {
      try {
        await db.run(
          `UPDATE messages SET is_read = 1 WHERE task_id = ? AND sender_id = ? AND receiver_id = ?`,
          [taskId, senderId, userId]
        );
        const senderSockets = activeUsers.get(String(senderId));
        if (senderSockets) {
          senderSockets.forEach(socketId => {
            io.to(socketId).emit('messages_read', { taskId, senderId, readerId: userId });
          });
        }
      } catch (err) {
        console.error('Failed to mark messages as read:', err.message);
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const userSockets = activeUsers.get(String(userId));
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeUsers.delete(String(userId));
        }
      }
    });
  });

  // Utility to send real-time notification to a specific user if connected
  async function sendRealtimeNotification(targetUserId, notification) {
    // 1. Save to database
    try {
      const result = await db.run(
        `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
        [targetUserId, notification.title, notification.message, notification.type]
      );
      notification.id = result.lastInsertRowid;
    } catch (err) {
      console.error('Failed to write notification to db:', err.message);
    }

    // 2. Emit if online
    const userSockets = activeUsers.get(String(targetUserId));
    if (userSockets) {
      userSockets.forEach(socketId => {
        io.to(socketId).emit('notification', notification);
      });
    }
  }

  // Export helper to call from standard Express API routes
  io.sendNotification = sendRealtimeNotification;
};
