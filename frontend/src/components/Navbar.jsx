import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, BACKEND_URL } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Bell, LogOut, User, Menu, X, PlusCircle, CheckCircle, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout, switchRole } = useAuth();
  const { notifications, unreadNotificationsCount, markAllNotificationsRead } = useSocket();
  const navigate = useNavigate();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const handleRoleSwitch = async (newRole) => {
    if (!user || newRole === user.role) return;
    setSwitchingRole(true);
    try {
      await switchRole(newRole);
      navigate('/dashboard');
    } catch (err) {
      alert(err.message || 'Failed to switch workspace role');
    } finally {
      setSwitchingRole(false);
    }
  };



  return (
    <header className="glass-header sticky top-0 z-50 px-6 py-4 flex items-center justify-between animate-fade-in-down">
      <div className="flex items-center space-x-3">
        <Link to="/" className="flex flex-col">
          <span className="text-2xl font-bold font-display tracking-tight text-gradient">StudySwap</span>
          <span className="text-[10px] tracking-wide text-[#A69080] uppercase font-medium">Academic Collaboration</span>
        </Link>
      </div>

      {/* Desktop Nav Links */}
      <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-[#D4C4B0]">
        {(!user || user.role !== 'client') && (
          <Link to="/browse" className="hover:text-[#AC8968] transition-colors">Browse Tasks</Link>
        )}
        {user && (
          <>
            <Link to="/dashboard" className="hover:text-[#AC8968] transition-colors">Dashboard</Link>
            <Link to="/inbox" className="hover:text-[#AC8968] transition-colors">Inbox</Link>
            {user.role === 'client' && (
              <Link to="/post-task" className="flex items-center space-x-1.5 text-[#AC8968] hover:text-[#D4C4B0] transition-colors">
                <PlusCircle size={16} />
                <span>Post Task</span>
              </Link>
            )}
            {user.role === 'admin' && (
              <Link to="/admin" className="flex items-center space-x-1 text-[#93785B] hover:text-[#E8DDD0] transition-colors font-semibold">
                <Shield size={15} />
                <span>Admin</span>
              </Link>
            )}
          </>
        )}
      </nav>

      {/* Right Actions */}
      <div className="hidden md:flex items-center space-x-4">
        {user ? (
          <>
            {/* Role Switcher Pill */}
            {(user.role === 'client' || user.role === 'helper') && (
              <div className="flex bg-[#1A1714] border border-[#2A2420] rounded-full p-0.5 space-x-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('client')}
                  disabled={switchingRole}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${
                    user.role === 'client'
                      ? 'bg-[#865D36] text-white shadow-md'
                      : 'text-[#A69080] hover:text-[#E8DDD0]'
                  } disabled:opacity-50`}
                >
                  Client
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('helper')}
                  disabled={switchingRole}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${
                    user.role === 'helper'
                      ? 'bg-[#865D36] text-white shadow-md'
                      : 'text-[#A69080] hover:text-[#E8DDD0]'
                  } disabled:opacity-50`}
                >
                  Helper
                </button>
              </div>
            )}


            {/* Notifications Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-full hover:bg-[#3E362E] border border-transparent hover:border-[#3E362E] text-[#A69080] hover:text-[#AC8968] transition relative"
              >
                <Bell size={20} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#865D36] text-[10px] font-bold text-white animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 glass rounded-2xl shadow-2xl p-4 border border-[#3E362E] max-h-[400px] overflow-y-auto z-50">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#3E362E]">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadNotificationsCount > 0 && (
                      <button 
                        onClick={markAllNotificationsRead}
                        className="text-xs text-[#AC8968] hover:text-[#D4C4B0] font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-[#A69080] text-xs">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-2.5 rounded-lg text-xs leading-relaxed transition ${notif.is_read ? 'bg-[#2A2420]/40 text-[#A69080]' : 'bg-[#1A1714]/20 border-l-2 border-[#93785B] text-[#E8DDD0]'}`}
                        >
                          <div className="font-semibold mb-0.5">{notif.title}</div>
                          <div>{notif.message}</div>
                          <div className="text-[10px] text-[#A69080] mt-1">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile avatar link */}
            <Link 
              to={`/profile/${user.id}`}
              className="flex items-center space-x-2 text-[#D4C4B0] hover:text-white transition"
            >
              {user.profile_picture ? (
                <img 
                  src={`${BACKEND_URL}${user.profile_picture}`} 
                  alt={user.full_name} 
                  className="w-8 h-8 rounded-full border border-[#573D23] object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1A1714]/50 border border-[#573D23] flex items-center justify-center text-[#AC8968] font-bold text-sm">
                  {user.full_name.charAt(0)}
                </div>
              )}
              <span className="hidden lg:inline text-xs font-semibold">{user.full_name.split(' ')[0]}</span>
            </Link>

            {/* Logout */}
            <button 
              onClick={() => { logout(); navigate('/'); }}
              className="p-2 rounded-full hover:bg-rose-950/20 text-[#A69080] hover:text-rose-400 transition"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <div className="flex items-center space-x-3 text-sm font-semibold">
            <Link to="/auth" className="px-4 py-2 text-[#D4C4B0] hover:text-white transition">Sign In</Link>
            <Link to="/auth" className="px-4 py-2 rounded-full bg-[#865D36] text-white hover:bg-[#93785B] transition shadow-lg shadow-[#865D36]/20">Get Started</Link>
          </div>
        )}
      </div>

      {/* Mobile Menu Icon */}
      <div className="md:hidden flex items-center space-x-3">

        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-[#A69080] hover:text-white transition"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 glass border-b border-[#3E362E] p-6 flex flex-col space-y-4 md:hidden z-40">
          {(!user || user.role !== 'client') && (
            <Link to="/browse" onClick={() => setMobileMenuOpen(false)} className="text-[#D4C4B0] hover:text-white text-sm font-medium">Browse Tasks</Link>
          )}
          {user ? (
            <>
              {/* Mobile Role Switcher */}
              {(user.role === 'client' || user.role === 'helper') && (
                <div className="flex justify-between items-center pb-3 border-b border-[#2A2420]">
                  <span className="text-xs text-[#A69080] font-semibold uppercase tracking-wider">Active Workspace</span>
                  <div className="flex bg-[#1A1714] border border-[#2A2420] rounded-full p-0.5 space-x-0.5">
                    <button
                      type="button"
                      onClick={() => { handleRoleSwitch('client'); setMobileMenuOpen(false); }}
                      disabled={switchingRole}
                      className={`px-3.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${
                        user.role === 'client'
                          ? 'bg-[#865D36] text-white'
                          : 'text-[#A69080] hover:text-[#E8DDD0]'
                      } disabled:opacity-50`}
                    >
                      Client
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleRoleSwitch('helper'); setMobileMenuOpen(false); }}
                      disabled={switchingRole}
                      className={`px-3.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${
                        user.role === 'helper'
                          ? 'bg-[#865D36] text-white'
                          : 'text-[#A69080] hover:text-[#E8DDD0]'
                      } disabled:opacity-50`}
                    >
                      Helper
                    </button>
                  </div>
                </div>
              )}

              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-[#D4C4B0] hover:text-white text-sm font-medium">Dashboard</Link>
              <Link to="/inbox" onClick={() => setMobileMenuOpen(false)} className="text-[#D4C4B0] hover:text-white text-sm font-medium">Inbox</Link>
              {user.role === 'client' && (
                <Link to="/post-task" onClick={() => setMobileMenuOpen(false)} className="text-[#AC8968] hover:text-white text-sm font-medium">Post Task</Link>
              )}
              {user.role === 'admin' && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="text-[#93785B] hover:text-white text-sm font-medium font-semibold">Admin Panel</Link>
              )}
              <Link to={`/profile/${user.id}`} onClick={() => setMobileMenuOpen(false)} className="text-[#D4C4B0] hover:text-white text-sm font-medium">My Profile</Link>
              <button 
                onClick={() => { logout(); navigate('/'); setMobileMenuOpen(false); }}
                className="flex items-center space-x-2 text-rose-400 hover:text-rose-300 text-sm font-medium pt-2 border-t border-[#3E362E]"
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col space-y-3 pt-2 border-t border-[#3E362E]">
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="text-[#D4C4B0] hover:text-white text-sm font-medium text-center py-2">Sign In</Link>
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="bg-[#865D36] hover:bg-[#93785B] text-white rounded-full text-sm font-medium text-center py-2">Get Started</Link>
            </div>
          )}
        </div>
      )}

    </header>
  );
}
