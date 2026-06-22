import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../context/AuthContext';
import { 
  Search, Filter, SlidersHorizontal, IndianRupee, Clock, 
  MessageSquare, User, ArrowUpRight, GraduationCap, X, Lock 
} from 'lucide-react';

export default function BrowseTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState(''); // default: show all tasks
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      if (minBudget) params.append('minBudget', minBudget);
      if (maxBudget) params.append('maxBudget', maxBudget);
      if (sortBy) params.append('sortBy', sortBy);

      const response = await fetch(`${API_BASE}/tasks?${params.toString()}`);
      const data = await response.json();
      if (response.ok) {
        setTasks(data);
      } else {
        setError(data.error || 'Failed to fetch tasks.');
      }
    } catch (err) {
      setError('Failed to connect to marketplace database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [category, status, sortBy]); // Auto trigger on select changes

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setMinBudget('');
    setMaxBudget('');
    setSortBy('newest');
    // We need to fetch again
    setTimeout(fetchTasks, 50);
  };

  const categories = [
    'Programming', 'Assignment Help', 'Notes Making', 
    'PPT Design', 'Research Work', 'Graphic Design', 'Tutoring'
  ];

  return (
    <div className="space-y-6 py-4">
      {/* Search Header */}
      <form onSubmit={handleSearchSubmit} className="glass p-5 rounded-3xl border border-[#3E362E] flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-3.5 text-[#A69080]" size={18} />
          <input 
            type="text"
            placeholder="Search assignments, reports, graphic designs, slide topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-[#2A2420]/50 border border-[#3E362E] focus:border-[#93785B] focus:outline-none text-xs text-white"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center space-x-3">
          <button 
            type="submit"
            className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-[#865D36] hover:bg-[#93785B] text-white font-bold text-xs transition"
          >
            Search
          </button>
          <button 
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="lg:hidden p-3 rounded-2xl bg-[#2A2420] border border-[#3E362E] text-[#D4C4B0]"
          >
            <Filter size={18} />
          </button>
        </div>
      </form>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left Side: Filter Sidebar (Desktop) */}
        <aside className="hidden lg:block glass p-6 rounded-3xl border border-[#3E362E] space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-[#2A2420]">
            <h3 className="text-sm font-bold font-display flex items-center space-x-2 text-[#AC8968]">
              <SlidersHorizontal size={15} />
              <span>Filters</span>
            </h3>
            <button 
              onClick={clearFilters}
              className="text-[10px] text-[#A69080] hover:text-white font-semibold transition"
            >
              Clear all
            </button>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#A69080]">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] focus:border-[#93785B] focus:outline-none text-xs text-[#D4C4B0] font-medium"
            >
              <option value="">All Categories</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#A69080]">Task Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] focus:border-[#93785B] focus:outline-none text-xs text-[#D4C4B0] font-medium"
            >
              <option value="">Any Status</option>
              <option value="open">Open for Bids</option>
              <option value="bidding">Bidding</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Budget Range */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#A69080]">Budget (₹)</label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number"
                placeholder="Min"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                onBlur={fetchTasks}
                className="w-full px-3 py-2 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] focus:border-[#93785B] focus:outline-none text-xs text-white"
              />
              <input 
                type="number"
                placeholder="Max"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                onBlur={fetchTasks}
                className="w-full px-3 py-2 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] focus:border-[#93785B] focus:outline-none text-xs text-white"
              />
            </div>
          </div>

          {/* Sorting */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#A69080]">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] focus:border-[#93785B] focus:outline-none text-xs text-[#D4C4B0] font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="budget_desc">Budget (High to Low)</option>
              <option value="deadline_soon">Deadline (Soonest)</option>
            </select>
          </div>
        </aside>

        {/* Mobile Filters Modal */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 lg:hidden">
            <div className="glass max-w-sm w-full rounded-3xl p-6 border border-[#3E362E] shadow-2xl relative space-y-6">
              <button 
                onClick={() => setShowMobileFilters(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#3E362E] text-[#A69080]"
              >
                <X size={18} />
              </button>

              <h3 className="text-lg font-bold font-display text-[#AC8968]">Filters</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#A69080]">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] text-xs text-[#D4C4B0]"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#A69080]">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] text-xs text-[#D4C4B0]"
                  >
                    <option value="">Any Status</option>
                    <option value="open">Open</option>
                    <option value="bidding">Bidding</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#A69080]">Budget Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="number"
                      placeholder="Min"
                      value={minBudget}
                      onChange={(e) => setMinBudget(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] text-xs text-white"
                    />
                    <input 
                      type="number"
                      placeholder="Max"
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#2A2420]/60 border border-[#3E362E] text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => { clearFilters(); setShowMobileFilters(false); }}
                  className="flex-1 py-2.5 rounded-full bg-[#2A2420] border border-[#3E362E] text-xs font-bold text-[#A69080]"
                >
                  Clear All
                </button>
                <button 
                  onClick={() => { fetchTasks(); setShowMobileFilters(false); }}
                  className="flex-1 py-2.5 rounded-full bg-[#865D36] text-xs font-bold text-white"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Task Grid */}
        <section className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-20 text-[#AC8968]">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#93785B] border-t-transparent mr-2"></div>
              <span className="font-semibold text-sm">Querying active marketplace...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-rose-300 text-xs">
              {error}
            </div>
          ) : tasks.length === 0 ? (
            <div className="glass p-16 text-center rounded-3xl border border-[#3E362E]/80 space-y-3">
              <div className="text-[#A69080] font-semibold text-sm">No tasks matched your search parameters.</div>
              <p className="text-xs text-[#A69080]">Try adjusting the search criteria or category filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  className={`glass p-6 rounded-2xl border flex flex-col justify-between transition group relative overflow-hidden ${
                    ['in_progress', 'submitted', 'completed'].includes(task.status)
                      ? 'border-[#3E362E]/40 opacity-60'
                      : 'border-[#3E362E] hover:border-[#573D23]/60'
                  }`}
                >
                  {/* Locked overlay for tasks with accepted bids */}
                  {['in_progress', 'submitted', 'completed'].includes(task.status) && (
                    <div className="absolute inset-0 bg-[#1A1714]/30 z-10 rounded-2xl flex items-center justify-center">
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-rose-950/60 border border-rose-800/50 backdrop-blur-sm">
                        <Lock size={14} className="text-rose-400" />
                        <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Locked</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-semibold bg-[#2A2420] border border-[#3E362E] text-[#A69080] px-2 py-0.5 rounded">
                        {task.category}
                      </span>
                      <span className="text-[10px] text-[#A69080] font-semibold flex items-center space-x-1">
                        <MessageSquare size={12} className="text-[#A69080]" />
                        <span>{task.bid_count} bids</span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-bold text-[#E8DDD0] group-hover:text-[#AC8968] transition-colors text-sm line-clamp-1">
                        {task.title}
                      </h4>
                      <p className="text-xs text-[#A69080] line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 text-[10px] text-[#A69080]">
                      <GraduationCap size={13} className="text-[#AC8968] shrink-0" />
                      <span className="truncate">{task.client_name} ({task.client_college})</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 mt-4 border-t border-[#2A2420]">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="text-[9px] text-[#A69080] font-semibold uppercase">Budget</div>
                        <div className="text-xs font-bold text-[#93785B] flex items-center">
                          <IndianRupee size={12} />
                          <span>{task.budget}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-[#A69080] font-semibold uppercase">Time left</div>
                        <div className="text-xs font-semibold text-[#D4C4B0] flex items-center space-x-1">
                          <Clock size={12} className="text-[#A69080]" />
                          <span>{task.deadline}</span>
                        </div>
                      </div>
                    </div>

                    {['in_progress', 'submitted', 'completed'].includes(task.status) ? (
                      <div className="p-2 rounded-xl bg-rose-950/30 border border-rose-900/40 text-xs font-bold text-rose-400 flex items-center space-x-1.5 cursor-not-allowed">
                        <Lock size={13} />
                        <span>Locked</span>
                      </div>
                    ) : (
                      <Link 
                        to={`/tasks/${task.id}`}
                        className="p-2 rounded-xl bg-[#1A1714] hover:bg-[#2A2420] border border-[#3E362E] text-xs font-bold text-[#D4C4B0] flex items-center space-x-1.5 transition"
                      >
                        <span>Bid Details</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
