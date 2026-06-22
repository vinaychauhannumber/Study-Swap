import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API_BASE } from '../context/AuthContext';
import { 
  Briefcase, CheckCircle, Clock, MessageSquare, AlertCircle, PlusCircle, 
  ArrowUpRight, Award, DollarSign, ListCollapse, BookmarkCheck,
  Pencil, Trash2, X
} from 'lucide-react';

export default function Dashboard() {
  const { user, token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  // Edit modal state
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', category: '', budget: '', deadline: '' });
  const [editLoading, setEditLoading] = useState(false);

  const categories = [
    'Programming', 'Assignment Help', 'Notes Making', 
    'PPT Design', 'Research Work', 'Graphic Design', 'Tutoring'
  ];

  const fetchMyTasks = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/tasks/my-tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setTasks(data);
      } else {
        setError(data.error || 'Failed to fetch tasks.');
      }
    } catch (err) {
      setError('Connection to backend failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, [token]);

  const activeTasks = tasks.filter(t => ['open', 'bidding', 'in_progress', 'submitted'].includes(t.status));
  const completedTasks = tasks.filter(t => ['completed', 'cancelled'].includes(t.status));
  
  const displayedTasks = user && user.role === 'client'
    ? (activeTab === 'active' ? activeTasks : completedTasks)
    : tasks;

  const handleDeleteTask = async (taskId, taskStatus) => {
    if (!canEditDelete(taskStatus)) {
      alert('This task is currently in progress or completed and cannot be deleted.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete task.');
      fetchMyTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditModal = (task) => {
    if (!canEditDelete(task.status)) {
      alert('This task is currently in progress or completed and cannot be edited.');
      return;
    }
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description,
      category: task.category,
      budget: task.budget,
      deadline: task.deadline
    });
  };

  // Submit edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const response = await fetch(`${API_BASE}/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update task.');
      setEditingTask(null);
      fetchMyTasks();
    } catch (err) {
      alert(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center py-20 text-[#748D92]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#124E66] border-t-transparent mr-2"></div>
        <span className="font-semibold text-sm">Parsing academic workspace...</span>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-[#212A31]/40 text-[#D3D9D4] border-[#2E3944]/40';
      case 'bidding': return 'bg-[#212A31]/40 text-amber-300 border-amber-800/40';
      case 'in_progress': return 'bg-blue-950/40 text-blue-300 border-blue-800/40';
      case 'submitted': return 'bg-[#212A31]/40 text-[#D3D9D4] border-[#2E3944]/40';
      case 'completed': return 'bg-[#212A31]/40 text-[#748D92] border-[#2E3944]/40';
      case 'cancelled': return 'bg-rose-950/40 text-rose-300 border-rose-800/40';
      default: return 'bg-[#212A31] text-[#748D92] border-[#2E3944]';
    }
  };

  const getStatusText = (status) => {
    if (status === 'in_progress') return 'In Progress';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const canEditDelete = (status) => ['open', 'bidding'].includes(status);

  return (
    <div className="space-y-10 py-4 page-enter">
      {/* Header Banner */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-[#2E3944] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in-up hover-glow">
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-[#748D92] uppercase tracking-wider">{user.role} workspace</div>
          <h2 className="text-2xl md:text-3xl font-bold font-display text-white">Hello, {user.full_name}!</h2>
          <p className="text-xs text-[#748D92] font-medium">
            {user.college} • {user.course} ({user.academic_year})
          </p>
        </div>
        {user.role === 'client' ? (
          <Link 
            to="/post-task"
            className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#124E66] hover:bg-[#124E66] text-white font-bold text-xs shadow-lg shadow-[#124E66]/20 transition shrink-0 btn-ripple hover-scale"
          >
            <PlusCircle size={15} />
            <span>Post New Task</span>
          </Link>
        ) : (
          <Link 
            to="/browse"
            className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#124E66] hover:bg-[#124E66] text-white font-bold text-xs shadow-lg shadow-[#124E66]/20 transition shrink-0 btn-ripple hover-scale"
          >
            <Briefcase size={15} />
            <span>Find Tasks to Bid</span>
          </Link>
        )}
      </div>

      {/* Metrics Row */}
      {user.role === 'client' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="glass p-5 rounded-2xl border border-[#2E3944] flex items-center space-x-4 hover-lift hover-shine animate-fade-in-up delay-200">
            <div className="p-3.5 rounded-xl bg-[#212A31] border border-[#2E3944] text-[#748D92]">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-xl font-bold font-display text-white">
                {tasks.filter(t => ['open', 'bidding', 'in_progress', 'submitted'].includes(t.status)).length}
              </div>
              <div className="text-[10px] text-[#748D92] font-semibold uppercase">Active / Pending Tasks</div>
            </div>
          </div>
          <div className="glass p-5 rounded-2xl border border-[#2E3944] flex items-center space-x-4 hover-lift hover-shine animate-fade-in-up delay-300">
            <div className="p-3.5 rounded-xl bg-[#212A31] border border-[#2E3944] text-[#124E66]">
              <CheckCircle size={20} />
            </div>
            <div>
              <div className="text-xl font-bold font-display text-white">
                {tasks.filter(t => t.status === 'completed').length}
              </div>
              <div className="text-[10px] text-[#748D92] font-semibold uppercase">Completed Tasks</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass p-5 rounded-2xl border border-[#2E3944] flex items-center space-x-4 hover-lift hover-shine animate-fade-in-up delay-200">
            <div className="p-3.5 rounded-xl bg-[#212A31] border border-[#2E3944] text-[#124E66]">
              <Award size={20} />
            </div>
            <div>
              <div className="text-lg font-bold font-display text-white">{user.rating?.toFixed(1)} ★</div>
              <div className="text-[10px] text-[#748D92] font-semibold uppercase">Overall Rating</div>
            </div>
          </div>
          <div className="glass p-5 rounded-2xl border border-[#2E3944] flex items-center space-x-4 hover-lift hover-shine animate-fade-in-up delay-300">
            <div className="p-3.5 rounded-xl bg-[#212A31] border border-[#2E3944] text-[#748D92]">
              <BookmarkCheck size={20} />
            </div>
            <div>
              <div className="text-lg font-bold font-display text-white">{user.completed_tasks}</div>
              <div className="text-[10px] text-[#748D92] font-semibold uppercase">Tasks Completed</div>
            </div>
          </div>
          <div className="glass p-5 rounded-2xl border border-[#2E3944] flex items-center space-x-4">
            <div className="p-3.5 rounded-xl bg-[#212A31] border border-[#2E3944] text-[#748D92]">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-lg font-bold font-display text-white">
                {tasks.filter(t => t.bid_status === 'pending').length}
              </div>
              <div className="text-[10px] text-[#748D92] font-semibold uppercase font-display">Active Bids</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Task List */}
      <section className="space-y-6">
        {user.role === 'client' ? (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#212A31] pb-3 gap-4">
            <div className="flex items-center space-x-2">
              <ListCollapse size={18} className="text-[#748D92]" />
              <h3 className="text-lg font-bold font-display text-white">Client Workspace</h3>
            </div>
            <div className="flex bg-[#212A31] p-1 rounded-xl border border-[#2E3944] space-x-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'active' ? 'bg-[#124E66] text-white' : 'text-[#748D92] hover:text-white'}`}
              >
                Active & Pending ({activeTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'completed' ? 'bg-[#124E66] text-white' : 'text-[#748D92] hover:text-white'}`}
              >
                Completed ({completedTasks.length})
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center border-b border-[#212A31] pb-3">
            <h3 className="text-lg font-bold font-display flex items-center space-x-2">
              <ListCollapse size={18} className="text-[#748D92]" />
              <span>My Bids & Assignments</span>
            </h3>
            <span className="text-[10px] font-semibold bg-[#212A31] text-[#748D92] px-2 py-0.5 rounded border border-[#2E3944]">
              {tasks.length} total entries
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 flex items-center space-x-2 text-rose-300 text-xs">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {displayedTasks.length === 0 ? (
          <div className="glass p-12 text-center rounded-3xl border border-[#2E3944]/80 space-y-4">
            <div className="text-[#748D92] font-medium text-sm">
              {user.role === 'client' 
                ? (activeTab === 'active' ? 'No active or pending tasks found.' : 'No completed tasks found in your archive.')
                : 'No tasks found in your workspace log.'}
            </div>
            {user.role === 'client' && activeTab === 'active' && (
              <Link to="/post-task" className="inline-block text-xs text-[#748D92] hover:underline">
                Create a task to get started →
              </Link>
            )}
            {user.role === 'helper' && (
              <Link to="/browse" className="inline-block text-xs text-[#124E66] hover:underline">
                Browse open tasks to bid →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedTasks.map((task) => (
              <div 
                key={task.id} 
                className="glass p-6 rounded-2xl border border-[#2E3944] flex flex-col justify-between hover:border-[#2E3944]/60 transition group relative overflow-hidden"
              >
                {/* Background glow for special tasks */}
                {task.status === 'submitted' && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl -mr-6 -mt-6"></div>
                )}
                {task.status === 'in_progress' && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl -mr-6 -mt-6"></div>
                )}

                <div className="space-y-4">
                  {/* Top line: Category, status, and edit/delete actions */}
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold bg-[#212A31] border border-[#2E3944] text-[#748D92] px-2 py-0.5 rounded">
                      {task.category}
                    </span>
                    <div className="flex items-center space-x-2">
                      {/* Edit / Delete buttons for client's own tasks */}
                      {user.role === 'client' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(task)}
                            className={`p-1.5 rounded-lg border transition ${
                              canEditDelete(task.status)
                                ? 'bg-[#212A31] hover:bg-[#212A31]/50 border-[#2E3944] hover:border-[#2E3944]/50 text-[#748D92] hover:text-[#748D92]'
                                : 'bg-[#212A31]/50 border-[#2E3944]/50 text-[#748D92] cursor-not-allowed'
                            }`}
                            title={canEditDelete(task.status) ? 'Edit Task' : 'Cannot edit — task is in progress'}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id, task.status)}
                            className={`p-1.5 rounded-lg border transition ${
                              canEditDelete(task.status)
                                ? 'bg-[#212A31] hover:bg-rose-950/50 border-[#2E3944] hover:border-rose-800/50 text-[#748D92] hover:text-rose-400'
                                : 'bg-[#212A31]/50 border-[#2E3944]/50 text-[#748D92] cursor-not-allowed'
                            }`}
                            title={canEditDelete(task.status) ? 'Delete Task' : 'Cannot delete — task is in progress'}
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(task.status)}`}>
                        {getStatusText(task.status)}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <Link to={`/tasks/${task.id}`} className="block">
                      <h4 className="font-bold text-[#D3D9D4] group-hover:text-[#748D92] transition-colors text-sm line-clamp-1">
                        {task.title}
                      </h4>
                    </Link>
                    <p className="text-xs text-[#748D92] line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  </div>

                  {/* Helpers bid-specific info */}
                  {user.role === 'helper' && (
                    <Link to={`/tasks/${task.id}`} className="block hover:opacity-80 transition pt-1 border-t border-[#212A31]">
                      <div className="flex items-center space-x-3">
                        <div className="text-[10px]">
                          <span className="text-[#748D92]">Your Bid:</span>{' '}
                          <span className="font-bold text-[#D3D9D4]">₹{task.bid_amount}</span>
                        </div>
                        <div className="text-[10px]">
                          <span className="text-[#748D92]">Bid Status:</span>{' '}
                          <span className={`font-semibold uppercase ${task.bid_status === 'accepted' ? 'text-[#124E66]' : task.bid_status === 'rejected' ? 'text-rose-400' : 'text-[#748D92]'}`}>
                            {task.bid_status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>

                {/* Bottom line: price, deadline, details button */}
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-[#212A31]">
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="text-[9px] text-[#748D92] font-semibold uppercase">Budget</div>
                      <div className="text-xs font-bold text-[#124E66]">₹{task.budget}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#748D92] font-semibold uppercase">Deadline</div>
                      <div className="text-xs font-semibold text-[#D3D9D4]">{task.deadline}</div>
                    </div>
                    {user.role === 'client' && (
                      <Link to={`/tasks/${task.id}`} className="block hover:opacity-80 transition text-left">
                        <div className="text-[9px] text-[#748D92] font-semibold uppercase">Bids</div>
                        <div className="text-xs font-bold text-[#748D92]">{task.bid_count} submitted</div>
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* View Details Link */}
                    <Link 
                      to={`/tasks/${task.id}`}
                      className="p-2 rounded-xl bg-[#212A31] hover:bg-[#212A31] border border-[#2E3944]/80 text-xs text-[#D3D9D4] flex items-center space-x-1.5 transition"
                    >
                      <span>Details</span>
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingTask(null)}
          ></div>
          
          {/* Modal */}
          <div className="relative w-full max-w-lg glass rounded-3xl border border-[#2E3944] p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-lg font-bold font-display text-white">Edit Task</h3>
                <p className="text-[10px] text-[#748D92]">Update your task details below</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingTask(null)}
                className="p-2 rounded-xl bg-[#212A31] hover:bg-[#2E3944] border border-[#2E3944] text-[#748D92] hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-[10px] font-semibold text-[#748D92] uppercase mb-1.5">Task Title</label>
                <input 
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#212A31]/60 border border-[#2E3944] focus:border-[#124E66] focus:outline-none text-xs text-white font-medium"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-semibold text-[#748D92] uppercase mb-1.5">Description</label>
                <textarea 
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#212A31]/60 border border-[#2E3944] focus:border-[#124E66] focus:outline-none text-xs text-white leading-relaxed"
                  required
                />
              </div>

              {/* Category & Budget row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-[#748D92] uppercase mb-1.5">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#212A31]/60 border border-[#2E3944] focus:border-[#124E66] focus:outline-none text-xs text-[#D3D9D4] font-medium"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#748D92] uppercase mb-1.5">Budget (₹)</label>
                  <input 
                    type="number"
                    value={editForm.budget}
                    onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#212A31]/60 border border-[#2E3944] focus:border-[#124E66] focus:outline-none text-xs text-white font-bold"
                    required
                  />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-[10px] font-semibold text-[#748D92] uppercase mb-1.5">Deadline</label>
                <input 
                  type="text"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                  placeholder="e.g. 3 Days, 1 Week"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#212A31]/60 border border-[#2E3944] focus:border-[#124E66] focus:outline-none text-xs text-white font-medium"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#124E66] hover:bg-[#124E66] text-white font-bold text-xs transition disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#212A31] hover:bg-[#2E3944] border border-[#2E3944] text-[#748D92] hover:text-white text-xs font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
