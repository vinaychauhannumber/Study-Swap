import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth, API_BASE } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  ArrowLeft, Brain, Calendar, FileUp, Sparkles, MessageSquare, 
  Send, CheckCircle, ShieldAlert, Award, Star, AlertTriangle, Users,
  Paperclip, FileText, CheckCheck, Lock, XCircle
} from 'lucide-react';

export default function TaskDetails() {
  const { id } = useParams();
  const { user, token, setUser } = useAuth();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bid form state
  const [bidAmount, setBidAmount] = useState('');
  const [deliveryHours, setDeliveryHours] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidSuccess, setBidSuccess] = useState(false);

  // Review Form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Chat Box States
  const [chatPartnerId, setChatPartnerId] = useState(null);
  const [chatPartnerName, setChatPartnerName] = useState('');
  const { socket, joinChatRoom, leaveChatRoom, sendMessageInRoom, sendTypingStatus, markChatRead } = useSocket();
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [peerTyping, setPeerTyping] = useState(false);
  const [chatUploading, setChatUploading] = useState(false);
  const chatMessagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const fetchTaskDetails = async () => {
    try {
      // 1. Fetch Task Info
      const taskRes = await fetch(`${API_BASE}/tasks/${id}`);
      const taskData = await taskRes.json();
      if (!taskRes.ok) throw new Error(taskData.error || 'Failed to fetch task details.');
      setTask(taskData);

      // 2. Fetch Bids list
      const bidsRes = await fetch(`${API_BASE}/tasks/${id}/bids`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const bidsData = await bidsRes.json();
      if (bidsRes.ok) setBids(bidsData);

    } catch (err) {
      setError(err.message || 'Error loading page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id, token]);

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setSubmittingBid(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taskId: Number(id),
          amount: parseFloat(bidAmount),
          deliveryHours: parseInt(deliveryHours),
          proposalMessage
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Bid submission failed.');
      
      setBidSuccess(true);
      setBidAmount('');
      setDeliveryHours('');
      setProposalMessage('');
      fetchTaskDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleCancelBid = async (bidId) => {
    if (!window.confirm('Are you sure you want to withdraw your proposal? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/bids/${bidId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to cancel bid.');
      alert('Proposal withdrawn successfully.');
      fetchTaskDetails();
    } catch (err) {
      alert(err.message);
    }
  };
  const handleAcceptBid = async (bidId, bidAmount) => {
    if (!window.confirm("Are you sure you want to accept this proposal? This will lock the task and close other negotiations.")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/bids/${bidId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Accepting proposal failed.');
      
      alert('Proposal accepted! Task status updated to In Progress.');
      fetchTaskDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    
    // Reviewee is client if user is helper, helper if user is client
    // For simplicity, we find the accepted helper for this task
    const acceptedBid = bids.find(b => b.status === 'accepted');
    const revieweeId = user.role === 'client' ? acceptedBid.helper_id : task.client_id;

    try {
      const response = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taskId: Number(id),
          revieweeId,
          rating: Number(reviewRating),
          comment: reviewComment
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Review failed.');
      
      setShowReviewForm(false);
      setReviewComment('');
      alert('Feedback review submitted successfully!');
      fetchTaskDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Set default chat partner once task details and user are loaded
  useEffect(() => {
    if (!task || !user) return;
    if (String(user.id) !== String(task.client_id)) {
      // Any visitor (helper or client) chats with task owner by default
      setChatPartnerId(task.client_id);
      setChatPartnerName(task.client_name);
    } else {
      // Task owner chats with accepted helper if assigned
      const accepted = bids.find(b => b.status === 'accepted');
      if (accepted) {
        setChatPartnerId(accepted.helper_id);
        setChatPartnerName(accepted.helper_name);
      }
    }
  }, [task, bids, user]);

  // Join chat room and fetch history on partner change
  useEffect(() => {
    if (!task || !chatPartnerId) return;

    const fetchChatHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/chat/${task.id}/history?partnerId=${chatPartnerId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setChatMessages(data);
          markChatRead(task.id, chatPartnerId);
        }
      } catch (err) {
        console.error('Failed to fetch task workspace chat history:', err);
      }
    };

    fetchChatHistory();
    joinChatRoom(task.id);

    return () => {
      leaveChatRoom(task.id);
    };
  }, [task, chatPartnerId, token]);

  // Listen to socket events
  useEffect(() => {
    if (!socket || !task || !chatPartnerId) return;

    const handleNewMessage = (msg) => {
      if (String(msg.task_id) === String(task.id)) {
        const isFromPartner = String(msg.sender_id) === String(chatPartnerId);
        const isToPartner = String(msg.receiver_id) === String(chatPartnerId);
        
        if (isFromPartner || isToPartner) {
          setChatMessages(prev => [...prev, msg]);
          if (isFromPartner) {
            markChatRead(task.id, chatPartnerId);
          }
        }
      }
    };

    const handleTypingStatus = ({ userId, isTyping }) => {
      if (String(userId) === String(chatPartnerId)) {
        setPeerTyping(isTyping);
      }
    };

    const handleMessagesRead = ({ taskId: readTaskId, senderId: readSenderId }) => {
      if (String(readTaskId) === String(task.id) && String(readSenderId) === String(user.id)) {
        setChatMessages(prev => prev.map(m => String(m.sender_id) === String(user.id) ? { ...m, is_read: 1 } : m));
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing_status', handleTypingStatus);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing_status', handleTypingStatus);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, task, chatPartnerId, user]);

  // Listen to socket notifications to refresh task details dynamically
  useEffect(() => {
    if (!socket || !id) return;

    const handleNotification = (notif) => {
      if (notif.type === 'bid' || notif.type === 'payment' || notif.type === 'submission') {
        fetchTaskDetails();
      }
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, id]);

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!newChatMessage.trim() || !chatPartnerId) return;

    sendMessageInRoom(task.id, chatPartnerId, newChatMessage);
    setNewChatMessage('');
    sendTypingStatus(task.id, chatPartnerId, false);
  };

  const handleChatInputChange = (e) => {
    setNewChatMessage(e.target.value);
    sendTypingStatus(task.id, chatPartnerId, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(task.id, chatPartnerId, false);
    }, 1500);
  };

  const handleChatFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !chatPartnerId) return;

    setChatUploading(true);
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

      sendMessageInRoom(task.id, chatPartnerId, null, data.fileUrl, data.fileName);
    } catch (err) {
      alert(err.message || 'File upload failed');
    } finally {
      setChatUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-400">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mr-2"></div>
        <span className="font-semibold text-sm">Securing network handshake...</span>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-4">
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-300 text-xs">
          {error}
        </div>
        <Link to="/browse" className="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:underline">
          <ArrowLeft size={14} />
          <span>Return to marketplace</span>
        </Link>
      </div>
    );
  }

  const isOwner = user && task && task.client_id === user.id;
  const myBid = user && bids.find(b => b.helper_id === user.id);
  const acceptedBid = bids.find(b => b.status === 'accepted');
  const isTaskLocked = ['in_progress', 'submitted', 'completed'].includes(task.status) && acceptedBid;
  const isAcceptedHelper = acceptedBid && user && acceptedBid.helper_id === user.id;

  // Check if attachments are present
  let fileList = [];
  if (task.attachments) {
    try {
      fileList = JSON.parse(task.attachments);
    } catch (e) {
      fileList = [];
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-8">
      {/* Back button */}
      <Link to="/browse" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition">
        <ArrowLeft size={14} />
        <span>Return to Marketplace</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left column: Task details */}
        <section className="lg:col-span-2 space-y-6">
          <div className="glass p-6 md:p-8 rounded-3xl border border-slate-800 space-y-6">
            
            {/* Header info */}
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                  {task.category}
                </span>
                <h2 className="text-2xl font-bold font-display text-white">{task.title}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400 font-medium">
                  <span>Posted by: <strong className="text-slate-300">{task.client_name}</strong></span>
                  <span>College: <strong className="text-slate-300">{task.client_college}</strong></span>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize shrink-0
                ${task.status === 'completed' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                  task.status === 'in_progress' ? 'bg-blue-950/40 text-blue-300 border-blue-800/40' :
                  task.status === 'submitted' ? 'bg-purple-950/40 text-purple-300 border-purple-800/40' :
                  'bg-indigo-950/40 text-indigo-300 border-indigo-800/40'}`}
              >
                {task.status === 'in_progress' ? 'In Progress' : task.status}
              </span>
            </div>

            {/* Description details */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Requirements</h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{task.description}</p>
            </div>

            {/* File attachments */}
            {fileList.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attachments</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fileList.map((url, index) => (
                    <a 
                      key={index}
                      href={`http://localhost:5005${url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-indigo-400 hover:text-indigo-300 hover:border-indigo-800/50 transition font-medium"
                    >
                      <FileUp size={16} />
                      <span className="truncate">Reference Document {index + 1}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI estimates review block */}
          {task.difficulty_level && (
            <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold font-display text-indigo-400 flex items-center space-x-2">
                <Brain size={15} />
                <span>AI Marketplace Assessment</span>
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[9px] text-slate-500 font-semibold uppercase">Difficulty</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">{task.difficulty_level}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[9px] text-slate-500 font-semibold uppercase">Est. Budget Range</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">{task.est_budget}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[9px] text-slate-500 font-semibold uppercase">Est. Effort</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">{task.est_time}</div>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Actions panel for active projects */}
          {task.status !== 'open' && task.status !== 'bidding' && (
            <div className="glass p-6 rounded-3xl border border-indigo-900/30 bg-indigo-950/5 space-y-4">
              <h3 className="text-sm font-bold font-display text-indigo-400 flex items-center space-x-2">
                <Sparkles size={16} className="text-indigo-400 animate-pulse-ring" />
                <span>Secure Escrow Collaboration Panel</span>
              </h3>
              
              <div className="flex flex-wrap gap-4 pt-1">
                {/* Chat shortcut */}
                {chatPartnerId && (
                  <button 
                    type="button"
                    onClick={() => {
                      document.getElementById('workspace-chat-box')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition animate-pulse-ring"
                  >
                    <MessageSquare size={14} />
                    <span>Open Real-Time Chat</span>
                  </button>
                )}

                {/* Submit work portal shortcut (for Helper) */}
                {user.role === 'helper' && ['in_progress', 'submitted'].includes(task.status) && (
                  <Link 
                    to={`/submission/${task.id}/${task.id}`}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                  >
                    <CheckCircle size={14} />
                    <span>{task.status === 'submitted' ? 'Submission details / quality check' : 'Submit completed work'}</span>
                  </Link>
                )}

                {/* Review submission portal shortcut (for Client) */}
                {user.role === 'client' && task.status === 'submitted' && (
                  <Link 
                    to={`/submission/${task.id}/${task.id}`}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition"
                  >
                    <CheckCircle size={14} />
                    <span>Verify deliverable & Release escrow</span>
                  </Link>
                )}

                {/* Rating review toggle */}
                {task.status === 'completed' && !showReviewForm && (
                  <button 
                    onClick={() => setShowReviewForm(true)}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition"
                  >
                    <Star size={14} />
                    <span>Leave a Review Rating</span>
                  </button>
                )}
              </div>

              {/* Review feedback Form */}
              {showReviewForm && (
                <form onSubmit={handleReviewSubmit} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 pt-4 mt-2">
                  <h4 className="text-xs font-bold text-slate-300">Submit Collaboration Experience</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-semibold mb-1">Stars Rating</label>
                      <select 
                        value={reviewRating}
                        onChange={(e) => setReviewRating(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-amber-400"
                      >
                        <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                        <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                        <option value="3">⭐⭐⭐ (3 Stars)</option>
                        <option value="2">⭐⭐ (2 Stars)</option>
                        <option value="1">⭐ (1 Star)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">Comments</label>
                    <textarea 
                      rows={3}
                      placeholder="Comment on communication quality, speed, formatting accuracy..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none text-xs text-white"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="submit" 
                      disabled={submittingReview}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition disabled:opacity-50"
                    >
                      {submittingReview ? 'Submitting...' : 'Post Review'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowReviewForm(false)}
                      className="px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Real-time Workspace Chat Box */}
          {chatPartnerId && (
            <div id="workspace-chat-box" className="glass rounded-3xl border border-slate-800 overflow-hidden flex flex-col h-[450px] space-y-0">
              {/* Header */}
              <div className="px-5 py-3.5 bg-slate-950/40 border-b border-slate-900 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-950/50 border border-slate-800 flex items-center justify-center text-indigo-400 text-[11px] font-bold font-display">
                    {chatPartnerName ? chatPartnerName.charAt(0) : '?'}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-200 font-display">Chat with {chatPartnerName}</h4>
                    <span className="text-[9px] text-slate-500 block">Task Peer Workspace</span>
                  </div>
                </div>
                <div className="text-[9px] text-indigo-400 bg-indigo-950/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Live Chat
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-slate-950/10">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs font-medium space-y-2">
                    <MessageSquare size={20} className="mx-auto text-slate-700 animate-bounce" />
                    <p>No chat history yet. Send a greeting to initiate discussion.</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isMe = String(msg.sender_id) === String(user.id);
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl p-3 space-y-1 ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'}`}>
                          {msg.content && <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                          {msg.file_url && (
                            <a 
                              href={`http://localhost:5005${msg.file_url}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 p-2 rounded-xl bg-black/30 text-indigo-300 hover:text-indigo-200 transition text-[10px] font-medium max-w-full"
                            >
                              <FileText size={13} />
                              <span className="truncate">{msg.file_name}</span>
                            </a>
                          )}
                          <div className="flex items-center justify-end space-x-1 text-[8px] text-slate-400/80 pt-0.5">
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && (
                              <CheckCheck 
                                size={11} 
                                className={msg.is_read ? 'text-indigo-300' : 'text-slate-500'} 
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
                    <div className="bg-slate-900 border border-slate-800 rounded-xl rounded-tl-none px-3 py-2 flex items-center space-x-1">
                      <div className="h-1.5 w-1.5 bg-slate-500 rounded-full typing-dot"></div>
                      <div className="h-1.5 w-1.5 bg-slate-500 rounded-full typing-dot"></div>
                      <div className="h-1.5 w-1.5 bg-slate-500 rounded-full typing-dot"></div>
                    </div>
                  </div>
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendChatMessage} className="p-3 bg-slate-950/40 border-t border-slate-900 flex items-center space-x-2">
                <div className="relative">
                  <input 
                    type="file" 
                    onChange={handleChatFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={chatUploading}
                  />
                  <button 
                    type="button" 
                    className="p-2 rounded-lg hover:bg-slate-900 border border-slate-900 text-slate-400 hover:text-indigo-400 transition"
                    title="Share File"
                  >
                    <Paperclip size={16} />
                  </button>
                </div>
                <input 
                  type="text"
                  placeholder={chatUploading ? 'Uploading file...' : 'Type a message...'}
                  value={newChatMessage}
                  onChange={handleChatInputChange}
                  disabled={chatUploading}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-950 focus:border-indigo-500 focus:outline-none text-[11px] text-white"
                />
                <button 
                  type="submit"
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shrink-0"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}
        </section>

        {/* Right column: Bids lists or Helper bidding forms */}
        <aside className="space-y-6">
          <div className="glass p-6 rounded-3xl border border-slate-800 space-y-6">
            <h3 className="text-xs font-bold font-display text-indigo-400 uppercase tracking-wider pb-2 border-b border-slate-900">
              Task Allocations
            </h3>
            
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Budget Cap</span>
              <span className="text-2xl font-bold font-display text-emerald-400">₹{task.budget}</span>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-900">
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Assistance Target</span>
              <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1">
                <Calendar size={14} className="text-slate-500" />
                <span>Deliver within {task.deadline}</span>
              </span>
            </div>
          </div>

          {/* Task Discussion for all visitors (non-owners) */}
          {user && String(user.id) !== String(task.client_id) && (
            <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold font-display text-indigo-400 uppercase tracking-wider pb-2 border-b border-slate-900">
                Task Discussion
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Discuss requirements or timeline details directly with the task owner.
              </p>
              <button 
                type="button" 
                onClick={() => {
                  setChatPartnerId(task.client_id);
                  setChatPartnerName(task.client_name);
                  setTimeout(() => {
                    document.getElementById('workspace-chat-box')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }} 
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition"
              >
                <MessageSquare size={13} />
                <span>Chat with Task Owner</span>
              </button>
            </div>
          )}

          {/* Client View: List of Helper proposals */}
          {isOwner && (task.status === 'open' || task.status === 'bidding') && (
            <div className="glass p-6 rounded-3xl border border-slate-800 space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                <h3 className="text-xs font-bold font-display text-indigo-400 uppercase tracking-wider">
                  Helper Bids ({bids.length})
                </h3>
              </div>
              
              {bids.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs font-medium">
                  Waiting for helper bids...
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {bids.map((bid) => (
                    <div key={bid.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative hover:border-slate-700 transition">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <Link to={`/profile/${bid.helper_id}`} className="text-xs font-bold text-slate-200 hover:text-indigo-400 transition block truncate">
                            {bid.helper_name}
                          </Link>
                          <span className="text-[9px] text-slate-500 block truncate">{bid.helper_college}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-emerald-400">₹{bid.amount}</div>
                          <div className="text-[9px] text-slate-500">{bid.delivery_hours} hours</div>
                        </div>
                      </div>

                      {/* Helper rating info */}
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                        <Star size={11} className="text-amber-500 fill-amber-500" />
                        <span className="font-bold text-slate-300">{bid.helper_rating?.toFixed(1)}</span>
                        <span className="text-slate-500">({bid.helper_tasks} tasks)</span>
                      </div>

                      <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-950 leading-relaxed line-clamp-3">
                        "{bid.proposal_message}"
                      </p>

                      <div className="flex gap-2 pt-1.5">
                        <button 
                          onClick={() => handleAcceptBid(bid.id, bid.amount)}
                          className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                        >
                          Accept Bid
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setChatPartnerId(bid.helper_id);
                            setChatPartnerName(bid.helper_name);
                            setTimeout(() => {
                              document.getElementById('workspace-chat-box')?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                          className={`px-3 py-1.5 rounded-xl border transition flex items-center justify-center ${chatPartnerId === bid.helper_id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
                          title={`Chat with ${bid.helper_name}`}
                        >
                          <MessageSquare size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Helper View: Bid Placement box */}
          {user && user.role === 'helper' && (
            <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold font-display text-indigo-400 uppercase tracking-wider pb-2 border-b border-slate-900">
                Placement Desk
              </h3>

              {isTaskLocked && !isAcceptedHelper ? (
                /* Locked state for non-accepted helpers */
                <div className="p-5 rounded-2xl bg-rose-950/15 border border-rose-900/30 space-y-4 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/40 border border-rose-800/40 flex items-center justify-center">
                    <Lock size={22} className="text-rose-400" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-rose-300 uppercase tracking-wider block">Task Locked</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      A helper's proposal has already been accepted for this task. No further bids or proposals can be submitted.
                    </p>
                  </div>
                  {myBid && (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">Your bid was:</span>
                        <span className="font-bold text-slate-300">₹{myBid.amount}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">Status:</span>
                        <span className={`font-bold uppercase ${myBid.status === 'rejected' ? 'text-rose-400' : 'text-amber-400'}`}>
                          {myBid.status === 'rejected' ? 'Declined' : 'Not Selected'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : myBid ? (
                <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/40 space-y-3">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Your Placed Proposal</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Offer amount:</span>
                    <strong className="text-emerald-400 font-bold text-sm">₹{myBid.amount}</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Delivery timeframe:</span>
                    <strong className="text-slate-300">{myBid.delivery_hours} Hours</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-900">
                    <span className="text-slate-400">Proposal status:</span>
                    <span className={`font-bold uppercase text-[10px] ${
                      myBid.status === 'accepted' ? 'text-emerald-400' :
                      myBid.status === 'rejected' ? 'text-red-400' :
                      'text-amber-400'
                    }`}>{myBid.status}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-900 space-y-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setChatPartnerId(task.client_id);
                        setChatPartnerName(task.client_name);
                        setTimeout(() => {
                          document.getElementById('workspace-chat-box')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                    >
                      <MessageSquare size={13} />
                      <span>Chat with Task Owner</span>
                    </button>
                    {myBid.status === 'pending' && (
                      <button 
                        type="button"
                        onClick={() => handleCancelBid(myBid.id)}
                        className="w-full py-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/50 text-rose-400 hover:text-rose-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                      >
                        <XCircle size={13} />
                        <span>Withdraw Proposal</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (task.status === 'open' || task.status === 'bidding') ? (
                <form onSubmit={handleBidSubmit} className="space-y-4">
                  {bidSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 text-xs">
                      Proposal bid registered successfully!
                    </div>
                  )}

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-300 text-xs">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Your Proposal Fee (₹)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 900"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-bold text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Estimated Delivery Hours</label>
                    <input 
                      type="number"
                      placeholder="e.g. 24"
                      value={deliveryHours}
                      onChange={(e) => setDeliveryHours(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-bold text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Proposal Message</label>
                    <textarea 
                      rows={3}
                      placeholder="Explain your course expertise, skills relevant, and fast milestones delivery assurances..."
                      value={proposalMessage}
                      onChange={(e) => setProposalMessage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-white focus:outline-none leading-relaxed"
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={submittingBid}
                    className="w-full py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition disabled:opacity-50"
                  >
                    {submittingBid ? 'Registering proposal...' : 'Submit Proposal Bid'}
                  </button>
                </form>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
