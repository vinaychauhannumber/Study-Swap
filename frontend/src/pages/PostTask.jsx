import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_BASE } from '../context/AuthContext';
import { 
  Sparkles, FileUp, AlertTriangle, ShieldCheck, HelpCircle, 
  Clock, DollarSign, Brain, Check, Send 
} from 'lucide-react';

export default function PostTask() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Programming');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('3 Days');
  const [attachments, setAttachments] = useState([]);

  // AI Pre-check states
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [scamAlert, setScamAlert] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debounced AI description checker
  useEffect(() => {
    if (title.length < 5 || description.length < 15) {
      setAiReport(null);
      setScamAlert(null);
      return;
    }

    const timer = setTimeout(async () => {
      setAiAnalyzing(true);
      try {
        const response = await fetch(`${API_BASE}/tasks/analyze-prepost`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title, description })
        });
        const data = await response.json();
        if (response.ok) {
          setAiReport(data.analysis);
          if (data.scam.is_scam) {
            setScamAlert(data.scam.reason);
          } else {
            setScamAlert(null);
          }
        }
      } catch (err) {
        console.error('AI check error:', err);
      } finally {
        setAiAnalyzing(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, description, token]);

  const handleFileChange = (e) => {
    setAttachments(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (scamAlert) {
      setError('Cannot publish: Description contains flags blocked by AI Scam Moderation.');
      return;
    }

    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('budget', budget);
    formData.append('deadline', deadline);
    
    attachments.forEach(file => {
      formData.append('attachments', file);
    });

    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to post task.');
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error occurred while publishing task.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'Programming', 'Assignment Help', 'Notes Making', 
    'PPT Design', 'Research Work', 'Graphic Design', 'Tutoring'
  ];

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8">
      {/* Page Header */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-[#3E362E] space-y-1.5">
        <h2 className="text-2xl font-bold font-display text-white">Post Academic Task</h2>
        <p className="text-xs text-[#A69080]">Describe the study support requirements, allocate virtual budget, and leverage AI estimates.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Forms */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 glass p-6 md:p-8 rounded-3xl border border-[#3E362E] space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/50 flex items-start space-x-2 text-rose-300 text-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[#A69080] mb-1.5">Task Title</label>
              <input 
                type="text"
                placeholder="e.g. React.js Dynamic Dashboard Assignment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] focus:border-[#93785B] focus:outline-none text-xs text-white"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-[#A69080] mb-1.5">Detailed Requirements & Context</label>
              <textarea 
                rows={6}
                placeholder="Explain the problem statements, required structure, grading criteria, and specific styling preferences..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] focus:border-[#93785B] focus:outline-none text-xs text-white leading-relaxed"
                required
              />
            </div>

            {/* Category & Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#A69080] mb-1.5">Subject Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] focus:border-[#93785B] focus:outline-none text-xs text-[#D4C4B0] font-semibold"
                >
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A69080] mb-1.5">Completion Deadline</label>
                <input 
                  type="text"
                  placeholder="e.g. 2 Days, 24 Hours, or 2026-06-30"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] focus:border-[#93785B] focus:outline-none text-xs text-white"
                  required
                />
              </div>
            </div>

            {/* Budget & Attachments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#A69080] mb-1.5">Budget Allocated (₹)</label>
                <input 
                  type="number"
                  placeholder="e.g. 1000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] focus:border-[#93785B] focus:outline-none text-xs text-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A69080] mb-1.5">Reference Documents</label>
                <div className="relative w-full">
                  <input 
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="w-full px-4 py-2.5 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] text-xs text-[#A69080] flex items-center justify-between pointer-events-none">
                    <span>{attachments.length > 0 ? `${attachments.length} files selected` : 'Choose files (PDF, ZIP, DOCX)'}</span>
                    <FileUp size={15} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !!scamAlert}
            className="w-full py-3.5 rounded-full bg-[#865D36] hover:bg-[#93785B] text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
          >
            <Send size={14} />
            <span>{loading ? 'Securing task posting...' : 'Publish to Marketplace'}</span>
          </button>
        </form>

        {/* Right Side: AI Assistant Panel */}
        <div className="glass p-6 rounded-3xl border border-[#3E362E] space-y-6">
          <h3 className="text-sm font-bold font-display flex items-center space-x-2 text-[#AC8968] pb-2 border-b border-[#2A2420]">
            <Brain size={16} />
            <span>AI Assist Desk</span>
          </h3>

          {/* Scam Detection Shield */}
          {scamAlert ? (
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 space-y-2">
              <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle size={15} />
                <span>Security Alert</span>
              </div>
              <p className="text-[11px] text-rose-300 leading-normal font-medium">{scamAlert}</p>
            </div>
          ) : (
            title && description && (
              <div className="p-4 rounded-2xl bg-[#1A1714]/25 border border-[#3E362E]/40 flex items-start space-x-2 text-[#AC8968] text-xs">
                <ShieldCheck size={16} className="shrink-0 mt-0.5 text-[#93785B]" />
                <span>Descriptive contents are compliant with peer collaboration guidelines.</span>
              </div>
            )
          )}

          {/* Dynamic Estimates */}
          {aiAnalyzing ? (
            <div className="flex items-center space-x-2 text-[#A69080] text-xs py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#A69080] border-t-transparent"></div>
              <span>AI running text check...</span>
            </div>
          ) : aiReport ? (
            <div className="space-y-4 pt-1">
              <div>
                <span className="text-[10px] text-[#A69080] font-semibold uppercase block">Assessed Difficulty</span>
                <span className={`text-xs font-bold ${aiReport.difficulty === 'Hard' ? 'text-rose-400' : aiReport.difficulty === 'Medium' ? 'text-[#AC8968]' : 'text-[#93785B]'}`}>
                  {aiReport.difficulty} Level
                </span>
              </div>

              <div>
                <span className="text-[10px] text-[#A69080] font-semibold uppercase block">Suggested Budget</span>
                <span className="text-xs font-bold text-[#E8DDD0]">{aiReport.est_budget}</span>
              </div>

              <div>
                <span className="text-[10px] text-[#A69080] font-semibold uppercase block">Estimated Effort</span>
                <span className="text-xs font-bold text-[#E8DDD0]">{aiReport.est_time}</span>
              </div>

              <div className="text-[10px] text-[#A69080] leading-relaxed pt-2 border-t border-[#2A2420] font-medium">
                Note: Estimations are based on historic completion metrics of academic tasks of similar scope.
              </div>
            </div>
          ) : (
            <div className="text-[#A69080] text-xs text-center py-10">
              Provide task title and description to activate AI estimator and scam scanner.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
