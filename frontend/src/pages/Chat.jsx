import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, API_BASE, BACKEND_URL } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  ArrowLeft, Send, Paperclip, FileText, CheckCheck, Sparkles, 
  MessageSquare, User, Laptop 
} from 'lucide-react';

export default function Chat() {
  const { taskId, receiverId } = useParams();
  const { user, token } = useAuth();
  const { 
    socket, joinChatRoom, leaveChatRoom, sendMessageInRoom, 
    sendTypingStatus, markChatRead 
  } = useSocket();

  const [task, setTask] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [bidStatuses, setBidStatuses] = useState({});

  useEffect(() => {
    const proposalMessages = messages.filter(m => m.content && m.content.startsWith('SYSTEM_PROPOSAL:'));
    if (proposalMessages.length === 0) return;

    proposalMessages.forEach(async (m) => {
      try {
        const jsonStr = m.content.substring('SYSTEM_PROPOSAL:'.length);
        const bidData = JSON.parse(jsonStr);
        const bidId = bidData.bidId;
        if (bidStatuses[bidId]) return;

        const res = await fetch(`${API_BASE}/bids/status/${bidId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setBidStatuses(prev => ({ ...prev, [bidId]: data.status }));
        }
      } catch (err) {
        console.error('Failed to fetch bid status:', err);
      }
    });
  }, [messages, token]);

  const handleAcceptBid = async (bidId) => {
    if (!window.confirm("Are you sure you want to accept this proposal? This will lock the task and close other negotiations.")) return;
    try {
      const res = await fetch(`${API_BASE}/bids/${bidId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setBidStatuses(prev => ({ ...prev, [bidId]: 'accepted' }));
        alert(data.message || 'Bid accepted! Task status is updated.');
        fetchChatMetadata();
      } else {
        alert(data.error || 'Failed to accept bid.');
      }
    } catch (err) {
      console.error('Accept bid error:', err);
      alert('An error occurred.');
    }
  };

  const handleRejectBid = async (bidId) => {
    if (!window.confirm("Are you sure you want to decline this proposal?")) return;
    try {
      const res = await fetch(`${API_BASE}/bids/${bidId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setBidStatuses(prev => ({ ...prev, [bidId]: 'rejected' }));
        alert(data.message || 'Bid declined.');
        fetchChatMetadata();
      } else {
        alert(data.error || 'Failed to decline bid.');
      }
    } catch (err) {
      console.error('Decline bid error:', err);
      alert('An error occurred.');
    }
  };

  const isLocked = task && 
    task.accepted_helper_id && 
    (user.role === 'helper' 
      ? String(user.id) !== String(task.accepted_helper_id)
      : String(receiverId) !== String(task.accepted_helper_id)
    );
  
  // File attachments state
  const [uploading, setUploading] = useState(false);
  
  // Typing indicators state
  const [peerTyping, setPeerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const messagesEndRef = useRef(null);

  const fetchChatMetadata = async () => {
    try {
      // 1. Fetch Task Info
      const taskRes = await fetch(`${API_BASE}/tasks/${taskId}`);
      const taskData = await taskRes.json();
      if (taskRes.ok) setTask(taskData);

      // 2. Fetch Receiver Profile Info
      const userRes = await fetch(`${API_BASE}/users/profile/${receiverId}`);
      const userData = await userRes.json();
      if (userRes.ok) setReceiver(userData.user);

      // 3. Fetch Message History
      const historyRes = await fetch(`${API_BASE}/chat/${taskId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const historyData = await historyRes.json();
      if (historyRes.ok) {
        setMessages(historyData);
        // Mark all messages from sender read
        markChatRead(taskId, receiverId);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    fetchChatMetadata();
    
    // Join Chat Room via Sockets
    joinChatRoom(taskId);

    return () => {
      // Leave Chat Room via Sockets
      leaveChatRoom(taskId);
    };
  }, [taskId, receiverId, token]);

  // Socket Events Listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // Make sure message belongs to this task
      if (String(msg.task_id) === String(taskId)) {
        setMessages(prev => [...prev, msg]);
        
        // Mark read if we are the receiver
        if (String(msg.sender_id) === String(receiverId)) {
          markChatRead(taskId, receiverId);
        }
      }
    };

    const handleTypingStatus = ({ userId, isTyping }) => {
      if (String(userId) === String(receiverId)) {
        setPeerTyping(isTyping);
      }
    };

    const handleMessagesRead = ({ taskId: readTaskId, senderId: readSenderId, readerId }) => {
      if (String(readTaskId) === String(taskId) && String(readSenderId) === String(user.id)) {
        // Peer has read my sent messages, update UI to read checkmarks
        setMessages(prev => prev.map(m => String(m.sender_id) === String(user.id) ? { ...m, is_read: 1 } : m));
      }
    };

    const handleError = (err) => {
      alert(err.message || 'An error occurred.');
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing_status', handleTypingStatus);
    socket.on('messages_read', handleMessagesRead);
    socket.on('error', handleError);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing_status', handleTypingStatus);
      socket.off('messages_read', handleMessagesRead);
      socket.off('error', handleError);
    };
  }, [socket, taskId, receiverId, user]);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, peerTyping]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    sendMessageInRoom(taskId, receiverId, newMessage);
    setNewMessage('');
    
    // Reset typing status
    sendTypingStatus(taskId, receiverId, false);
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Emit typing status
    sendTypingStatus(taskId, receiverId, true);

    // Clear previous timeout and set new one to reset typing indicator after 1.5s
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(taskId, receiverId, false);
    }, 1500);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/chat/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');

      // Dispatch file message
      sendMessageInRoom(taskId, receiverId, null, data.fileUrl, data.fileName);
    } catch (err) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-140px)] py-2 items-stretch">
      
      {/* Left panel: Task metadata card */}
      <div className="hidden lg:block glass p-5 rounded-3xl border border-[#3E362E] space-y-6 flex flex-col justify-between">
        <div className="space-y-6">
          <Link to={`/tasks/${taskId}`} className="inline-flex items-center space-x-1 text-xs text-[#A69080] hover:text-white transition">
            <ArrowLeft size={13} />
            <span>Task details</span>
          </Link>
          
          {task && (
            <div className="space-y-4">
              <span className="text-[9px] font-semibold bg-[#2A2420] border border-[#3E362E] text-[#AC8968] px-2 py-0.5 rounded uppercase">
                {task.category}
              </span>
              <h3 className="text-sm font-bold text-[#F5EDE4] line-clamp-2 leading-relaxed">{task.title}</h3>
              <p className="text-[11px] text-[#A69080] line-clamp-4 leading-relaxed">{task.description}</p>
              
              <div className="space-y-2.5 pt-4 border-t border-[#2A2420] text-xs">
                <div className="flex justify-between">
                  <span className="text-[#A69080]">Escrow budget:</span>
                  <strong className="text-[#93785B]">₹{task.budget}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A69080]">Target timeline:</span>
                  <strong className="text-[#D4C4B0]">{task.deadline}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3.5 rounded-2xl bg-[#1A1714]/20 border border-[#1A1714]/40 text-[10px] text-[#D4C4B0] leading-normal flex items-start space-x-1.5 font-medium">
          <Sparkles size={14} className="shrink-0 mt-0.5" />
          <span>All chat exchanges are monitored for fair academic guidelines validation.</span>
        </div>
      </div>

      {/* Middle/Main panel: Chat thread */}
      <div className="lg:col-span-3 glass rounded-3xl border border-[#3E362E] flex flex-col justify-between overflow-hidden">
        
        {/* Chat header */}
        <div className="p-4 bg-[#1A1714]/40 border-b border-[#2A2420] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/dashboard" className="p-1.5 rounded-lg hover:bg-[#2A2420] border border-transparent hover:border-[#3E362E] text-[#A69080] lg:hidden shrink-0">
              <ArrowLeft size={16} />
            </Link>
            {receiver ? (
              <div className="flex items-center space-x-2.5">
                {receiver.profile_picture ? (
                  <img 
                    src={`${BACKEND_URL}${receiver.profile_picture}`} 
                    alt={receiver.full_name} 
                    className="w-8 h-8 rounded-full border border-[#3E362E] object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1A1714]/50 border border-[#3E362E] flex items-center justify-center text-[#AC8968] text-xs font-bold font-display">
                    {receiver.full_name.charAt(0)}
                  </div>
                )}
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-[#E8DDD0]">{receiver.full_name}</h4>
                  <span className="text-[9px] text-[#A69080] block truncate">{receiver.college} • {receiver.role}</span>
                </div>
              </div>
            ) : (
              <span className="text-xs font-semibold text-[#A69080]">Connecting peer session...</span>
            )}
          </div>
          
          <div className="text-[10px] text-[#AC8968] bg-[#1A1714]/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
            Secure Channel
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#1A1714]/10">
          {messages.length === 0 ? (
            <div className="text-center py-20 text-[#A69080] text-xs font-medium space-y-2">
              <MessageSquare size={24} className="mx-auto text-[#573D23] animate-bounce" />
              <p>No chat history. Send a secure greeting to initiate collaboration.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = String(msg.sender_id) === String(user.id);
              const isProposal = msg.content && msg.content.startsWith('SYSTEM_PROPOSAL:');

              if (isProposal) {
                let proposalData = null;
                try {
                  const jsonStr = msg.content.substring('SYSTEM_PROPOSAL:'.length);
                  proposalData = JSON.parse(jsonStr);
                } catch (e) {
                  console.error('Failed to parse proposal message:', e);
                }

                if (proposalData) {
                  const bidStatus = bidStatuses[proposalData.bidId] || 'pending';
                  return (
                    <div key={msg.id} className="flex justify-center my-4 w-full">
                      <div className="w-full max-w-md rounded-2xl border border-[#1A1714]/30 bg-gradient-to-b from-[#0f142b] to-[#070915] p-5 shadow-2xl shadow-[#1A1714]/50 space-y-4 backdrop-blur-xl">
                        <div className="flex items-center justify-between border-b border-[#1A1714]/60 pb-3">
                          <div className="flex items-center space-x-2 text-[#AC8968]">
                            <Sparkles size={16} />
                            <span className="text-[10px] font-bold tracking-wider uppercase font-display">Study Proposal Received</span>
                          </div>
                          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            bidStatus === 'accepted' ? 'bg-[#1A1714]/50 text-[#93785B] border border-[#1A1714]/50' :
                            bidStatus === 'rejected' ? 'bg-red-950/50 text-red-400 border border-red-900/50' :
                            'bg-[#1A1714]/50 text-[#AC8968] border border-[#3E362E]/50'
                          }`}>
                            {bidStatus === 'pending' ? '⏳ Pending' : bidStatus === 'accepted' ? '✅ Accepted' : '❌ Declined'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#0c1024]/80 border border-[#1A1714]/40 p-3 rounded-xl space-y-1">
                            <span className="text-[9px] text-[#A69080] uppercase block font-bold">Budget Offer</span>
                            <strong className="text-sm text-[#93785B] font-extrabold font-display">₹{proposalData.amount}</strong>
                          </div>
                          <div className="bg-[#0c1024]/80 border border-[#1A1714]/40 p-3 rounded-xl space-y-1">
                            <span className="text-[9px] text-[#A69080] uppercase block font-bold">Est. Delivery</span>
                            <strong className="text-sm text-[#D4C4B0] font-extrabold font-display">{proposalData.deliveryHours} Hours</strong>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[9px] text-[#A69080] uppercase block font-bold">Proposal Statement</span>
                          <p className="text-xs text-[#D4C4B0] bg-[#1A1714]/30 border border-[#2A2420]/40 p-3 rounded-xl leading-relaxed italic">
                            "{proposalData.proposalMessage}"
                          </p>
                        </div>

                        {user.role === 'client' && bidStatus === 'pending' && (
                          <div className="flex items-center space-x-2.5 pt-2">
                            <button
                              type="button"
                              onClick={() => handleAcceptBid(proposalData.bidId)}
                              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#93785B] to-teal-600 hover:from-[#865D36] hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-[#1A1714]/30"
                            >
                              Accept Proposal
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectBid(proposalData.bidId)}
                              className="px-4 py-2 rounded-xl border border-red-900/50 hover:bg-red-950/20 text-red-400 text-xs font-bold transition"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        
                        <div className="text-[8px] text-[#A69080] text-center font-medium">
                          Submitted at {new Date(msg.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                }
              }

              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl p-3.5 space-y-1 ${isMe ? 'bg-[#865D36] text-white rounded-tr-none' : 'bg-[#2A2420] border border-[#3E362E] text-[#E8DDD0] rounded-tl-none'}`}>
                    
                    {/* Text content */}
                    {msg.content && <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                    {/* File Attachment */}
                    {msg.file_url && (
                      <a 
                        href={`${BACKEND_URL}${msg.file_url}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 p-2 rounded-xl bg-black/30 text-[#D4C4B0] hover:text-[#E8DDD0] transition text-[11px] font-medium max-w-full"
                      >
                        <FileText size={15} />
                        <span className="truncate">{msg.file_name}</span>
                      </a>
                    )}

                    {/* Time & Read Receipts */}
                    <div className="flex items-center justify-end space-x-1 text-[9px] text-[#A69080]/80 pt-1">
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <CheckCheck 
                          size={13} 
                          className={msg.is_read ? 'text-[#D4C4B0]' : 'text-[#A69080]'} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {/* Peer Typing Indicator */}
          {peerTyping && (
            <div className="flex justify-start">
              <div className="bg-[#2A2420] border border-[#3E362E] rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center space-x-1">
                <div className="h-1.5 w-1.5 bg-[#A69080] rounded-full typing-dot"></div>
                <div className="h-1.5 w-1.5 bg-[#A69080] rounded-full typing-dot"></div>
                <div className="h-1.5 w-1.5 bg-[#A69080] rounded-full typing-dot"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Lock status banner */}
        {isLocked && (
          <div className="p-3.5 bg-red-950/20 border-t border-red-900/40 text-[11px] text-red-300 flex items-center justify-center space-x-2 font-medium">
            <span>🔒 This task has been assigned to another helper. Chat is locked.</span>
          </div>
        )}

        {/* Input box */}
        <form onSubmit={handleSendMessage} className="p-4 bg-[#1A1714]/40 border-t border-[#2A2420] flex items-center space-x-3">
          
          {/* File upload clip */}
          <div className="relative">
            <input 
              type="file" 
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              disabled={uploading || isLocked}
            />
            <button 
              type="button" 
              disabled={uploading || isLocked}
              className="p-2.5 rounded-xl hover:bg-[#2A2420] border border-[#2A2420] text-[#A69080] hover:text-[#AC8968] transition disabled:opacity-40 disabled:hover:text-[#A69080]"
              title="Share File (PDF, DOCX, ZIP)"
            >
              <Paperclip size={18} />
            </button>
          </div>

          {/* Text Input */}
          <input 
            type="text"
            placeholder={isLocked ? 'Chat is locked for this task' : uploading ? 'Processing file delivery...' : 'Type a message...'}
            value={newMessage}
            onChange={handleInputChange}
            disabled={uploading || isLocked}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#2A2420]/60 border border-[#1A1714] focus:border-[#93785B] focus:outline-none text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {/* Send Icon */}
          <button 
            type="submit"
            disabled={isLocked}
            className="p-2.5 rounded-xl bg-[#865D36] hover:bg-[#93785B] text-white transition shrink-0 disabled:opacity-40 disabled:hover:bg-[#865D36]"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
