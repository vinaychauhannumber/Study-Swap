import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth, API_BASE, BACKEND_URL } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Fetch initial notifications list
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setNotifications(data);
        setUnreadNotificationsCount(data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadNotificationsCount(0);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect to WebSocket server
    const newSocket = io(BACKEND_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to StudySwap WebSocket Server');
    });

    newSocket.on('notification', (notification) => {
      console.log('Received notification:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadNotificationsCount(prev => prev + 1);

      // Simple browser notification if permission allowed
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.message });
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    setSocket(newSocket);

    // Request browser notification permissions
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  const markAllNotificationsRead = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        setUnreadNotificationsCount(0);
      }
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const joinChatRoom = (taskId) => {
    if (socket) {
      socket.emit('join_room', { taskId });
    }
  };

  const leaveChatRoom = (taskId) => {
    if (socket) {
      socket.emit('leave_room', { taskId });
    }
  };

  const sendMessageInRoom = (taskId, receiverId, content, fileUrl = null, fileName = null) => {
    if (socket) {
      socket.emit('send_message', { taskId, receiverId, content, fileUrl, fileName });
    }
  };

  const sendTypingStatus = (taskId, receiverId, isTyping) => {
    if (socket) {
      socket.emit('typing', { taskId, receiverId, isTyping });
    }
  };

  const markChatRead = (taskId, senderId) => {
    if (socket) {
      socket.emit('mark_read', { taskId, senderId });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      notifications,
      unreadNotificationsCount,
      markAllNotificationsRead,
      joinChatRoom,
      leaveChatRoom,
      sendMessageInRoom,
      sendTypingStatus,
      markChatRead,
      refreshNotifications: fetchNotifications
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
