import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth, API_BASE, BACKEND_URL } from '../context/AuthContext';
import { 
  ArrowLeft, Brain, FileDown, CheckCircle, RefreshCcw, 
  Sparkles, Award, ShieldCheck, AlertTriangle, MessageSquare, ShieldAlert 
} from 'lucide-react';

export default function Submission() {
  const { taskId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper submission form state
  const [submissionFile, setSubmissionFile] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Client revision form state
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionComments, setRevisionComments] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const fetchSubmissionDetails = async () => {
    try {
      // 1. Fetch Task Info
      const taskRes = await fetch(`${API_BASE}/tasks/${taskId}`);
      const taskData = await taskRes.json();
      if (!taskRes.ok) throw new Error(taskData.error || 'Failed to load task info');
      setTask(taskData);

      // 2. Fetch Submissions Info
      const subsRes = await fetch(`${API_BASE}/tasks/${taskId}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const subsData = await subsRes.json();
      if (subsRes.ok) setSubmissions(subsData);

    } catch (err) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissionDetails();
  }, [taskId, token]);

  const handleFileChange = (e) => {
    setSubmissionFile(e.target.files[0]);
  };

  const handleHelperSubmit = async (e) => {
    e.preventDefault();
    if (!submissionFile) return;

    setSubmitting(true);
    setError(null);
    const formData = new FormData();
    formData.append('taskId', taskId);
    formData.append('comment', comment);
    formData.append('submission_file', submissionFile);

    try {
      const response = await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Submission failed');

      alert('Work submitted successfully! AI Checker has run quality scans.');
      setSubmissionFile(null);
      setComment('');
      fetchSubmissionDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveSubmission = async (subId) => {
    if (!window.confirm('Are you sure you want to approve this submission? This will release the secured escrow funds directly to the helper (minus a 10% platform commission fee). This operation cannot be undone.')) {
      return;
    }

    setProcessingAction(true);
    try {
      const response = await fetch(`${API_BASE}/submissions/${subId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Approval release failed');

      alert('Deliverable approved successfully! Escrow released to helper balance.');
      navigate('/dashboard');
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    if (!revisionComments.trim()) return;

    setProcessingAction(true);
    const latestSub = submissions[0]; // Most recent submission
    try {
      const response = await fetch(`${API_BASE}/submissions/${latestSub.id}/revision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ revisionComments })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Revision request failed.');

      alert('Revision request sent to helper.');
      setShowRevisionForm(false);
      setRevisionComments('');
      fetchSubmissionDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-[#748D92]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#124E66] border-t-transparent mr-2"></div>
        <span className="font-semibold text-sm">Evaluating quality registers...</span>
      </div>
    );
  }

  const latestSubmission = submissions[0];

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8">
      {/* Back button */}
      <Link to={`/tasks/${taskId}`} className="inline-flex items-center space-x-1.5 text-xs text-[#748D92] hover:text-white transition">
        <ArrowLeft size={14} />
        <span>Return to Task Details</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Submission Manager Console */}
        <section className="lg:col-span-2 space-y-6">
          <div className="glass p-6 md:p-8 rounded-3xl border border-[#2E3944] space-y-6">
            <h2 className="text-xl font-bold font-display text-white">Submission Console</h2>
            
            {task && (
              <div className="p-4 rounded-2xl bg-[#212A31] border border-slate-850 text-xs">
                <span className="text-[9px] text-[#748D92] font-semibold block uppercase">Task under review</span>
                <strong className="text-[#D3D9D4] text-sm font-display block mt-1">{task.title}</strong>
                <span className="text-[10px] text-[#748D92] block mt-1">Escrow held: ₹{task.budget}</span>
              </div>
            )}

            {/* Helper Submission Form */}
            {user.role === 'helper' && ['in_progress', 'submitted'].includes(task.status) && (
              <form onSubmit={handleHelperSubmit} className="space-y-4 pt-4 border-t border-[#212A31]">
                <h3 className="text-xs font-bold text-[#D3D9D4]">Submit Completed Deliverables</h3>
                {error && (
                  <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-300 text-xs">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-[10px] font-semibold text-[#748D92] mb-1.5">Deliverable File</label>
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 rounded-xl bg-[#212A31] border border-[#2E3944] text-xs text-[#748D92]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#748D92] mb-1.5">Submission Comments</label>
                  <textarea 
                    rows={4}
                    placeholder="Summarize the implementation milestones, run details, bibliography formatting, and code run directions..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#212A31] border border-[#2E3944] text-xs text-white focus:outline-none leading-relaxed"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-full bg-[#124E66] hover:bg-[#124E66] text-white font-bold text-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Running AI scans & uploading...' : 'Upload Work Deliverables'}
                </button>
              </form>
            )}

            {/* Client View: Review console */}
            {user.role === 'client' && task.status === 'submitted' && latestSubmission && (
              <div className="space-y-4 pt-4 border-t border-[#212A31]">
                <h3 className="text-xs font-bold text-[#D3D9D4]">Evaluate Helper Deliverable</h3>
                
                <div className="p-4 rounded-xl bg-[#212A31] border border-[#2E3944] space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#748D92]">File uploaded:</span>
                    <a 
                      href={`${BACKEND_URL}${latestSubmission.file_url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1.5 text-[#748D92] hover:underline font-bold text-xs"
                    >
                      <FileDown size={14} />
                      <span>{latestSubmission.file_name}</span>
                    </a>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#748D92] uppercase font-semibold block">Helper Comments:</span>
                    <p className="text-xs text-[#D3D9D4] italic">"{latestSubmission.comment}"</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => handleApproveSubmission(latestSubmission.id)}
                    disabled={processingAction}
                    className="flex-1 py-2.5 rounded-full bg-[#124E66] hover:bg-[#124E66] text-white font-bold text-xs transition disabled:opacity-50"
                  >
                    Release Escrow Payout
                  </button>
                  <button 
                    onClick={() => setShowRevisionForm(true)}
                    disabled={processingAction}
                    className="flex-1 py-2.5 rounded-full bg-[#212A31] border border-[#2E3944] text-[#748D92] hover:text-white font-bold text-xs transition disabled:opacity-50"
                  >
                    Request Revision
                  </button>
                </div>

                {showRevisionForm && (
                  <form onSubmit={handleRevisionSubmit} className="p-4 rounded-2xl bg-[#212A31] border border-[#2E3944] space-y-4 pt-4 mt-2">
                    <h4 className="text-xs font-bold text-[#D3D9D4]">Request Revisions Feedback</h4>
                    <div>
                      <textarea 
                        rows={3}
                        placeholder="Detail the corrections needed: typography, layouts, content additions..."
                        value={revisionComments}
                        onChange={(e) => setRevisionComments(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#212A31] border border-slate-850 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="submit" 
                        className="px-4 py-2 rounded-lg bg-[#124E66] hover:bg-[#124E66] text-white text-xs font-bold transition"
                      >
                        Submit Revision Feedback
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowRevisionForm(false)}
                        className="px-4 py-2 rounded-lg bg-[#212A31] border border-[#2E3944] text-[#748D92] hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Side: AI Quality Checker Report */}
        <aside className="space-y-6">
          <div className="glass p-6 rounded-3xl border border-[#2E3944] space-y-6">
            <h3 className="text-sm font-bold font-display text-[#748D92] flex items-center space-x-2 pb-2 border-b border-[#212A31]">
              <Brain size={16} />
              <span>AI Quality check</span>
            </h3>

            {latestSubmission ? (
              <div className="space-y-5 pt-1">
                {/* Score Dial */}
                <div className="text-center py-2 relative">
                  <div className="text-3xl font-black font-display text-[#748D92]">{latestSubmission.ai_score}%</div>
                  <div className="text-[10px] text-[#748D92] font-semibold uppercase mt-1">Completeness Score</div>
                </div>

                <div className="space-y-3.5 pt-4 border-t border-[#212A31] text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#748D92]">Grammar Index:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${latestSubmission.ai_grammar === 'Needs Correction' ? 'bg-rose-950/20 text-rose-300' : 'bg-[#212A31]/20 text-[#748D92]'}`}>
                      {latestSubmission.ai_grammar}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#748D92]">Formatting Check:</span>
                    <span className="font-bold text-[#D3D9D4]">{latestSubmission.ai_formatting}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#748D92]">Plagiarism Check:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${latestSubmission.ai_plagiarism > 15 ? 'bg-rose-950/20 text-rose-300 animate-pulse' : 'bg-[#212A31]/20 text-[#748D92]'}`}>
                      {latestSubmission.ai_plagiarism}% Similarity
                    </span>
                  </div>
                </div>

                {latestSubmission.ai_plagiarism > 15 && (
                  <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/50 text-[10px] text-rose-300 flex items-start space-x-2 leading-relaxed">
                    <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                    <span>Plagiarism threshold exceeded. Client is advised to review document sources thoroughly.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[#748D92] text-xs text-center py-10 leading-relaxed font-medium">
                AI Checker is offline until helper registers a completed work deliverable.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
