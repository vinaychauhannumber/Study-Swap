import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import { 
  Users, BarChart3, AlertCircle, Ban, ToggleLeft, ToggleRight, 
  ShieldAlert, Award, CheckSquare, Sparkles 
} from 'lucide-react';

export default function AdminDashboard() {
  const { token } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'analytics'
  const [userSearch, setUserSearch] = useState('');

  const fetchAdminData = async () => {
    try {
      // 1. Fetch Analytics
      const analyticsRes = await fetch(`${API_BASE}/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const analyticsData = await analyticsRes.json();
      if (analyticsRes.ok) setAnalytics(analyticsData);

      // 2. Fetch Users List
      const usersRes = await fetch(`${API_BASE}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      if (usersRes.ok) setUsers(usersData);

    } catch (err) {
      setError('Connection to admin services failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleToggleSuspension = async (userId) => {
    if (!window.confirm('Are you sure you want to change the suspension state for this account? Suspended users will be immediately locked out of their active sessions.')) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/admin/users/${userId}/toggle-suspension`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Operation failed');
      
      alert(data.message);
      // Refresh user lists
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-black/70">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-black border-t-transparent mr-2"></div>
        <span className="font-semibold text-sm">Synchronizing administrative database...</span>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.college.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-10 py-4">
      {/* Header */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-[#FFE5BF] flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#FFFAF3]/40 border border-[#FFE5BF]/40 text-[9px] font-bold text-black uppercase tracking-wide">
            <ShieldAlert size={12} className="mr-0.5 text-black" />
            <span>Admin Clearance Level</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-black">Platform Administrator Center</h2>
          <p className="text-xs text-black/70">Manage user accounts status, review platform commission balances, and audit academic task postings.</p>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass p-5 rounded-2xl border border-[#FFE5BF] flex items-center space-x-4">
            <div className="p-3.5 rounded-xl bg-[#FFFAF3] border border-[#FFE5BF] text-black/70">
              <Users size={20} />
            </div>
            <div>
              <div className="text-xl font-bold font-display text-black">{analytics.totalUsers}</div>
              <div className="text-[10px] text-black/70 font-semibold uppercase">Total Users</div>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-[#FFE5BF] flex items-center space-x-4">
            <div className="p-3.5 rounded-xl bg-[#FFFAF3] border border-[#FFE5BF] text-black/70">
              <BarChart3 size={20} />
            </div>
            <div>
              <div className="text-xl font-bold font-display text-black">{analytics.activeTasks}</div>
              <div className="text-[10px] text-black/70 font-semibold uppercase">Active Task Postings</div>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-[#FFE5BF] flex items-center space-x-4">
            <div className="p-3.5 rounded-xl bg-[#FFFAF3] border border-[#FFE5BF] text-black">
              <CheckSquare size={20} />
            </div>
            <div>
              <div className="text-xl font-bold font-display text-black">{analytics.completionRate}%</div>
              <div className="text-[10px] text-black/70 font-semibold uppercase">Completion Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex space-x-4 border-b border-[#FFE5BF] pb-3">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'users' ? 'bg-[#FFE5BF] text-black' : 'bg-[#FFFAF3] text-slate-450 border border-[#FFE5BF] hover:text-black'}`}
        >
          Users Account Control
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'analytics' ? 'bg-[#FFE5BF] text-black' : 'bg-[#FFFAF3] text-slate-450 border border-[#FFE5BF] hover:text-black'}`}
        >
          Categories Share Metrics
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-100/20 border border-rose-300/50 text-rose-600 text-xs">
          {error}
        </div>
      )}

      {/* Tab Panel: Users */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* User Search Bar */}
          <div className="max-w-md w-full relative">
            <Users className="absolute left-3 top-2.5 text-black/70" size={16} />
            <input 
              type="text"
              placeholder="Filter by name, email, or college..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#FFFAF3] border border-[#FFE5BF] focus:outline-none text-xs text-black"
            />
          </div>

          {/* User Table Grid */}
          <div className="glass rounded-2xl border border-[#FFE5BF] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FFFAF3]/40 text-black/70 border-b border-slate-850 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Student Details</th>
                  <th className="p-4">College</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Tasks done</th>
                  <th className="p-4">Escrow Balance</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Moderations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-black">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FFFAF3]/20 transition">
                    <td className="p-4">
                      <div className="font-semibold text-black">{u.full_name}</div>
                      <div className="text-[10px] text-black/70 mt-0.5">{u.email}</div>
                    </td>
                    <td className="p-4 truncate max-w-[150px]">{u.college}</td>
                    <td className="p-4 uppercase font-bold text-[10px] tracking-wide text-black/70">{u.role}</td>
                    <td className="p-4 font-semibold">{u.completed_tasks} completed</td>
                    <td className="p-4 font-bold text-black">₹{u.balance?.toFixed(0)}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.is_suspended ? 'bg-rose-100/30 text-rose-600 border border-rose-300/40' : 'bg-[#FFFAF3]/20 text-black/70 border border-emerald-850'}`}>
                        {u.is_suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {u.role !== 'admin' && (
                        <button 
                          onClick={() => handleToggleSuspension(u.id)}
                          className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center justify-center space-x-1 ml-auto
                            ${u.is_suspended ? 'bg-[#FFFAF3]/20 text-black border-[#FFE5BF]/40 hover:bg-[#FFE5BF]' : 'bg-rose-100/20 text-rose-400 border-rose-300/40 hover:bg-rose-600'}`}
                        >
                          <Ban size={12} />
                          <span>{u.is_suspended ? 'Re-activate' : 'Suspend'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Panel: Categories Shares */}
      {activeTab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="glass p-6 rounded-3xl border border-[#FFE5BF] space-y-4">
            <h3 className="text-sm font-bold font-display text-black/70">Subject Categories Distribution</h3>
            <div className="space-y-3.5">
              {analytics.categories.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-black">{cat.category}</span>
                    <span className="text-black/70">{cat.count} Tasks</span>
                  </div>
                  <div className="w-full bg-[#FFFAF3] rounded-full h-2">
                    <div 
                      className="bg-[#FFE5BF] h-2 rounded-full" 
                      style={{ width: `${Math.min(100, (cat.count / Math.max(1, analytics.activeTasks)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-6 rounded-3xl border border-[#FFE5BF] space-y-4">
            <h3 className="text-sm font-bold font-display text-black/70">Commissions Audit Policy</h3>
            <p className="text-xs text-black/70 leading-relaxed">
              StudySwap operates a decentralized peer mediation structure. The platform holds project deposits in escrows, checking submissions through Gemini NLP analysis and releasing payments to helpers on approval.
            </p>
            <div className="p-4 rounded-xl bg-[#FFFAF3]/20 border border-purple-900/50 text-[11px] text-black leading-normal flex items-start space-x-1.5">
              <Sparkles size={14} className="shrink-0 mt-0.5 text-black" />
              <span>A 10% base platform commission fee is automatically withheld from each release payout transaction to fund hosting and Gemini API models check expenses.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
