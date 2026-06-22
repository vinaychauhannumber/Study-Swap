import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API_BASE, BACKEND_URL } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Send, Paperclip, FileText, CheckCheck, Sparkles, 
  MessageSquare, User, MessageCircle, Search, Calendar, Folder
} from 'lucide-react';

export default function Inbox() {
  const { user, token } = useAuth();
  const { 
    socket, joinChatRoom, leaveChatRoom, sendMessageInRoom, 
    sendTypingStatus, markChatRead 
  } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // File uploads
  const [uploading, setUploading] = useState(false);

  // Typing state
  const [peerTyping, setPeerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Proposal Bid statuses map: bidId -> status
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
        fetchConversations();
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
        fetchConversations();
      } else {
        alert(data.error || 'Failed to decline bid.');
      }
    } catch (err) {
      console.error('Decline bid error:', err);
      alert('An error occurred.');
    }
  };

  const isLocked = activeConversation && 
    activeConversation.acceptedHelperId && 
    (user.role === 'helper' 
      ? String(user.id) !== String(activeConversation.acceptedHelperId)
      : String(activeConversation.partnerId) !== String(activeConversation.acceptedHelperId)
    );

  // Sync activeConversation details if conversations list updates
  useEffect(() => {
    if (!activeConversation) return;
    const updated = conversations.find(c => 
      String(c.taskId) === String(activeConversation.taskId) && 
      String(c.partnerId) === String(activeConversation.partnerId)
    );
    if (updated) {
      if (updated.acceptedHelperId !== activeConversation.acceptedHelperId || updated.taskStatus !== activeConversation.taskStatus) {
        setActiveConversation(updated);
      }
    }
  }, [conversations, activeConversation]);

  // Fetch active conversation list
  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setConversations(data);
      }
    } catch (err) {
      console.error('Failed to fetch inbox conversations:', err);
    } finally {
      setLoadingConv(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [token]);

  // Load history and join socket room on active conversation change
  useEffect(() => {
    if (!activeConversation) return;

    setLoadingMessages(true);
    setPeerTyping(false);

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/chat/${activeConversation.taskId}/history?partnerId=${activeConversation.partnerId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setMessages(data);
          markChatRead(activeConversation.taskId, activeConversation.partnerId);
          // Set unread count to 0 in local state
          setConversations(prev => prev.map(c => 
            (String(c.taskId) === String(activeConversation.taskId) && String(c.partnerId) === String(activeConversation.partnerId))
              ? { ...c, unreadCount: 0 }
              : c
          ));
        }
      } catch (err) {
        console.error('Failed to fetch active chat history:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchHistory();
    joinChatRoom(activeConversation.taskId);

    return () => {
      leaveChatRoom(activeConversation.taskId);
    };
  }, [activeConversation, token]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // 1. If it belongs to the active conversation, append it
      if (activeConversation && String(msg.task_id) === String(activeConversation.taskId)) {
        const partnerId = activeConversation.partnerId;
        const isFromPartner = String(msg.sender_id) === String(partnerId);
        const isToPartner = String(msg.receiver_id) === String(partnerId);

        if (isFromPartner || isToPartner) {
          setMessages(prev => [...prev, msg]);
          if (isFromPartner) {
            markChatRead(activeConversation.taskId, partnerId);
          }
        }
      }

      // 2. Update snippet preview and bubble count in conversation list
      setConversations(prevList => {
        const senderId = msg.sender_id;
        const receiverId = msg.receiver_id;
        const taskId = msg.task_id;
        
        // Find which partner is involved in this message
        const partnerId = String(senderId) === String(user.id) ? receiverId : senderId;
        const existingIdx = prevList.findIndex(c => String(c.taskId) === String(taskId) && String(c.partnerId) === String(partnerId));
        
        let newList = [...prevList];
        if (existingIdx > -1) {
          const oldConv = newList[existingIdx];
          const isCurrentlyActive = activeConversation && 
            String(activeConversation.taskId) === String(taskId) && 
            String(activeConversation.partnerId) === String(partnerId);

          const updatedConv = {
            ...oldConv,
            lastMessage: msg.content || (msg.file_url ? 'Sent a file.' : ''),
            lastMessageTime: msg.created_at,
            lastSenderId: senderId,
            unreadCount: isCurrentlyActive 
              ? 0 
              : (String(receiverId) === String(user.id) ? oldConv.unreadCount + 1 : oldConv.unreadCount)
          };
          newList.splice(existingIdx, 1);
          return [updatedConv, ...newList];
        } else {
          // If conversation wasn't found in current state, trigger background refetch
          fetchConversations();
          return prevList;
        }
      });
    };

    const handleTypingStatus = ({ userId, isTyping }) => {
      if (activeConversation && String(userId) === String(activeConversation.partnerId)) {
        setPeerTyping(isTyping);
      }
    };

    const handleMessagesRead = ({ taskId: readTaskId, senderId: readSenderId }) => {
      if (activeConversation && String(readTaskId) === String(activeConversation.taskId) && String(readSenderId) === String(user.id)) {
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
  }, [socket, activeConversation, user]);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, peerTyping]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    sendMessageInRoom(activeConversation.taskId, activeConversation.partnerId, newMessage);
    setNewMessage('');
    sendTypingStatus(activeConversation.taskId, activeConversation.partnerId, false);
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!activeConversation) return;

    sendTypingStatus(activeConversation.taskId, activeConversation.partnerId, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(activeConversation.taskId, activeConversation.partnerId, false);
    }, 1500);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConversation) return;

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

      sendMessageInRoom(activeConversation.taskId, activeConversation.partnerId, null, data.fileUrl, data.fileName);
    } catch (err) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.taskTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 h-[calc(100vh-150px)] border border-[#2E3944] rounded-3xl bg-[#080d1a]/40 backdrop-blur-xl overflow-hidden items-stretch">
      
      {/* Left Pane: Conversation Threads */}
      <div className="lg:col-span-1 border-r border-[#2E3944] flex flex-col bg-[#212A31]/20">
        
        {/* Search header */}
        <div className="p-4 border-b border-[#212A31] space-y-3.5">
          <h2 className="text-base font-bold text-white font-display flex items-center space-x-2">
            <MessageCircle size={18} className="text-[#748D92]" />
            <span>Chat Workspace</span>
          </h2>
          
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-3 text-[#748D92]" />
            <input 
              type="text"
              placeholder="Search chat or task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#212A31]/60 border border-[#212A31] text-xs text-white focus:outline-none focus:border-[#124E66] transition placeholder:text-[#748D92]"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConv ? (
            <div className="text-center py-10 text-[#748D92]">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#124E66] border-t-transparent mx-auto mb-2"></div>
              <span className="text-[10px] font-semibold">Loading inbox...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 text-[#748D92] text-xs px-4">
              {searchQuery ? 'No matching conversations' : 'No active chats found. Browse tasks and submit proposal bids to start.'}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = activeConversation && 
                activeConversation.taskId === c.taskId && 
                activeConversation.partnerId === c.partnerId;

              return (
                <button
                  key={`${c.taskId}_${c.partnerId}`}
                  onClick={() => setActiveConversation(c)}
                  className={`w-full text-left p-3 rounded-2xl flex items-start space-x-3 transition relative group ${
                    isSelected 
                      ? 'bg-[#124E66]/10 border border-[#124E66]/30' 
                      : 'hover:bg-[#212A31]/40 border border-transparent hover:border-[#2E3944]/50'
                  }`}
                >
                  {/* Partner Avatar */}
                  <div className="relative shrink-0">
                    {c.partnerPic ? (
                      <img 
                        src={`${BACKEND_URL}${c.partnerPic}`} 
                        alt={c.partnerName} 
                        className="w-9 h-9 rounded-full object-cover border border-[#2E3944]"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#212A31]/40 border border-[#2E3944] flex items-center justify-center text-[#748D92] font-bold text-xs">
                        {c.partnerName.charAt(0)}
                      </div>
                    )}
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#070a13] ${
                      c.partnerRole === 'helper' ? 'bg-[#124E66]' : 'bg-[#124E66]'
                    }`} />
                  </div>

                  {/* Context preview */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex justify-between items-baseline gap-1">
                      <h4 className="text-xs font-bold text-[#D3D9D4] truncate group-hover:text-[#748D92] transition-colors">
                        {c.partnerName}
                      </h4>
                      <span className="text-[8px] text-[#748D92] font-medium whitespace-nowrap">
                        {new Date(c.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    {/* Task Title */}
                    <div className="text-[9px] text-[#748D92] font-medium truncate flex items-center space-x-1">
                      <Folder size={9} className="text-[#748D92]/70" />
                      <span>{c.taskTitle}</span>
                    </div>

                    {/* Preview text */}
                    <p className={`text-[10px] truncate leading-normal ${c.unreadCount > 0 ? 'text-[#D3D9D4] font-semibold' : 'text-[#748D92]'}`}>
                      {c.lastSenderId === user.id ? 'You: ' : ''}{c.lastMessage}
                    </p>
                  </div>

                  {/* Unread bubble count */}
                  {c.unreadCount > 0 && (
                    <span className="absolute right-3 bottom-3 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-[#124E66] text-[8px] font-bold text-white shadow-lg shadow-[#212A31]/30">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Message Workspace */}
      <div className="lg:col-span-3 flex flex-col justify-between overflow-hidden bg-[#212A31]/5">
        {activeConversation ? (
          <>
            {/* Header info */}
            <div className="p-4 bg-[#212A31]/40 border-b border-[#212A31] flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                {activeConversation.partnerPic ? (
                  <img 
                    src={`${BACKEND_URL}${activeConversation.partnerPic}`} 
                    alt={activeConversation.partnerName} 
                    className="w-9 h-9 rounded-full object-cover border border-[#2E3944]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#212A31]/40 border border-[#2E3944] flex items-center justify-center text-[#748D92] font-bold text-xs">
                    {activeConversation.partnerName.charAt(0)}
                  </div>
                )}
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-xs font-bold text-[#D3D9D4] truncate">{activeConversation.partnerName}</h3>
                  <Link to={`/tasks/${activeConversation.taskId}`} className="text-[10px] text-[#748D92] hover:underline hover:text-[#D3D9D4] transition flex items-center space-x-1">
                    <Folder size={10} className="text-[#748D92]" />
                    <span className="truncate">Regarding: {activeConversation.taskTitle}</span>
                  </Link>
                </div>
              </div>

              <div className="text-[9px] text-[#748D92] bg-[#212A31]/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                Secure Escrow Chat
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[#212A31]/10">
              {loadingMessages ? (
                <div className="text-center py-20 text-[#748D92]">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#124E66] border-t-transparent mx-auto mb-2"></div>
                  <span className="text-xs">Fetching message history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20 text-[#748D92] text-xs font-medium space-y-2">
                  <MessageSquare size={20} className="mx-auto text-[#2E3944] animate-bounce" />
                  <p>Send a secure message to initiate discussion.</p>
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
                          <div className="w-full max-w-md rounded-2xl border border-[#212A31]/30 bg-gradient-to-b from-[#0f142b] to-[#070915] p-5 shadow-2xl shadow-[#212A31]/50 space-y-4 backdrop-blur-xl">
                            <div className="flex items-center justify-between border-b border-[#212A31]/60 pb-3">
                              <div className="flex items-center space-x-2 text-[#748D92]">
                                <Sparkles size={16} />
                                <span className="text-[10px] font-bold tracking-wider uppercase font-display">Study Proposal Received</span>
                              </div>
                              <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                bidStatus === 'accepted' ? 'bg-[#212A31]/50 text-[#124E66] border border-[#212A31]/50' :
                                bidStatus === 'rejected' ? 'bg-red-950/50 text-red-400 border border-red-900/50' :
                                'bg-[#212A31]/50 text-[#748D92] border border-[#2E3944]/50'
                              }`}>
                                {bidStatus === 'pending' ? '⏳ Pending' : bidStatus === 'accepted' ? '✅ Accepted' : '❌ Declined'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-[#0c1024]/80 border border-[#212A31]/40 p-3 rounded-xl space-y-1">
                                <span className="text-[9px] text-[#748D92] uppercase block font-bold">Budget Offer</span>
                                <strong className="text-sm text-[#124E66] font-extrabold font-display">₹{proposalData.amount}</strong>
                              </div>
                              <div className="bg-[#0c1024]/80 border border-[#212A31]/40 p-3 rounded-xl space-y-1">
                                <span className="text-[9px] text-[#748D92] uppercase block font-bold">Est. Delivery</span>
                                <strong className="text-sm text-[#D3D9D4] font-extrabold font-display">{proposalData.deliveryHours} Hours</strong>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-[9px] text-[#748D92] uppercase block font-bold">Proposal Statement</span>
                              <p className="text-xs text-[#D3D9D4] bg-[#212A31]/30 border border-[#212A31]/40 p-3 rounded-xl leading-relaxed italic">
                                "{proposalData.proposalMessage}"
                              </p>
                            </div>

                            {user.role === 'client' && bidStatus === 'pending' && (
                              <div className="flex items-center space-x-2.5 pt-2">
                                <button
                                  type="button"
                                  onClick={() => handleAcceptBid(proposalData.bidId)}
                                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#124E66] to-teal-600 hover:from-[#124E66] hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-[#212A31]/30"
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
                            
                            <div className="text-[8px] text-[#748D92] text-center font-medium">
                              Submitted at {new Date(msg.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  }

                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl p-3.5 space-y-1 ${isMe ? 'bg-[#124E66] text-white rounded-tr-none' : 'bg-[#212A31] border border-[#2E3944] text-[#D3D9D4] rounded-tl-none'}`}>
                        {msg.content && <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                        {msg.file_url && (
                          <a 
                            href={`${BACKEND_URL}${msg.file_url}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 p-2.5 rounded-xl bg-black/30 text-[#D3D9D4] hover:text-[#D3D9D4] transition text-[10px] font-medium max-w-full"
                          >
                            <FileText size={14} />
                            <span className="truncate">{msg.file_name}</span>
                          </a>
                        )}
                        <div className="flex items-center justify-end space-x-1 text-[8px] text-[#748D92]/80 pt-0.5">
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            <CheckCheck 
                              size={11} 
                              className={msg.is_read ? 'text-[#D3D9D4]' : 'text-[#748D92]'} 
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {peerTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#212A31] border border-[#2E3944] rounded-xl rounded-tl-none px-3.5 py-2 flex items-center space-x-1">
                    <div className="h-1.5 w-1.5 bg-[#748D92] rounded-full typing-dot"></div>
                    <div className="h-1.5 w-1.5 bg-[#748D92] rounded-full typing-dot"></div>
                    <div className="h-1.5 w-1.5 bg-[#748D92] rounded-full typing-dot"></div>
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

            {/* Input area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#212A31]/40 border-t border-[#212A31] flex items-center space-x-2.5">
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
                  className="p-2.5 rounded-xl hover:bg-[#212A31] border border-[#212A31] text-[#748D92] hover:text-[#748D92] transition disabled:opacity-40 disabled:hover:text-[#748D92]"
                  title="Share Reference file"
                >
                  <Paperclip size={16} />
                </button>
              </div>
              <input 
                type="text"
                placeholder={isLocked ? 'Chat is locked for this task' : uploading ? 'Uploading file...' : 'Type a message...'}
                value={newMessage}
                onChange={handleInputChange}
                disabled={uploading || isLocked}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#212A31]/60 border border-[#212A31] focus:border-[#124E66] focus:outline-none text-[11px] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button 
                type="submit"
                disabled={isLocked}
                className="p-2.5 rounded-xl bg-[#124E66] hover:bg-[#124E66] text-white transition shrink-0 disabled:opacity-40 disabled:hover:bg-[#124E66]"
              >
                <Send size={15} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#212A31]/30 border border-[#2E3944] flex items-center justify-center text-[#748D92] shadow-xl shadow-[#212A31]/20 animate-pulse">
              <MessageSquare size={28} />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-bold text-[#D3D9D4] font-display">Select a conversation</h3>
              <p className="text-xs text-[#748D92] leading-normal">
                Choose a conversation thread from the left list to start real-time messaging, review document attachments, and check progress details.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
