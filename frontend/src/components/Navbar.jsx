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
          <span className="text-[10px] tracking-wide text-black/70 uppercase font-medium">Academic Collaboration</span>
        </Link>
      </div>

      {/* Desktop Nav Links */}
      <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-black">
        {(!user || user.role !== 'client') && (
          <Link to="/browse" className="hover:text-black/70 transition-colors">Browse Tasks</Link>
        )}
        {user && (
          <>
            <Link to="/dashboard" className="hover:text-black/70 transition-colors">Dashboard</Link>
            <Link to="/inbox" className="hover:text-black/70 transition-colors">Inbox</Link>
            {user.role === 'client' && (
              <Link to="/post-task" className="flex items-center space-x-1.5 text-black/70 hover:text-black transition-colors">
                <PlusCircle size={16} />
                <span>Post Task</span>
              </Link>
            )}
            {user.role === 'admin' && (
              <Link to="/admin" className="flex items-center space-x-1 text-black hover:text-black transition-colors font-semibold">
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
              <div className="flex bg-[#FFFAF3] border border-[#FFE5BF] rounded-full p-0.5 space-x-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('client')}
                  disabled={switchingRole}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${
                    user.role === 'client'
                      ? 'bg-[#FFE5BF] text-black shadow-md'
                      : 'text-black/70 hover:text-black'
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
                      ? 'bg-[#FFE5BF] text-black shadow-md'
                      : 'text-black/70 hover:text-black'
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
                className="p-2 rounded-full hover:bg-[#FFF2DB] border border-transparent hover:border-[#FFE5BF] text-black/70 hover:text-black/70 transition relative"
              >
                <Bell size={20} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFE5BF] text-[10px] font-bold text-black animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 glass rounded-2xl shadow-2xl p-4 border border-[#FFE5BF] max-h-[400px] overflow-y-auto z-50">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#FFE5BF]">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadNotificationsCount > 0 && (
                      <button 
                        onClick={markAllNotificationsRead}
                        className="text-xs text-black/70 hover:text-black font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-black/70 text-xs">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-2.5 rounded-lg text-xs leading-relaxed transition ${notif.is_read ? 'bg-[#FFFAF3]/40 text-black/70' : 'bg-[#FFFAF3]/20 border-l-2 border-black text-black'}`}
                        >
                          <div className="font-semibold mb-0.5">{notif.title}</div>
                          <div>{notif.message}</div>
                          <div className="text-[10px] text-black/70 mt-1">
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
              className="flex items-center space-x-2 text-black hover:text-black transition"
            >
              {user.profile_picture ? (
                <img 
                  src={`${BACKEND_URL}${user.profile_picture}`} 
                  alt={user.full_name} 
                  className="w-8 h-8 rounded-full border border-[#FFE5BF] object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#FFFAF3]/50 border border-[#FFE5BF] flex items-center justify-center text-black/70 font-bold text-sm">
                  {user.full_name.charAt(0)}
                </div>
              )}
              <span className="hidden lg:inline text-xs font-semibold">{user.full_name.split(' ')[0]}</span>
            </Link>

            {/* Logout */}
            <button 
              onClick={() => { logout(); navigate('/'); }}
              className="p-2 rounded-full hover:bg-rose-100/20 text-black/70 hover:text-rose-400 transition"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <div className="flex items-center space-x-3 text-sm font-semibold">
            <Link to="/auth" className="px-4 py-2 text-black hover:text-black transition">Sign In</Link>
            <Link to="/auth" className="px-4 py-2 rounded-full bg-[#FFE5BF] text-black hover:bg-[#FFE5BF] transition shadow-lg shadow-black/20">Get Started</Link>
          </div>
        )}
      </div>

      {/* Mobile Menu Icon */}
      <div className="md:hidden flex items-center space-x-3">

        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-black/70 hover:text-black transition"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 glass border-b border-[#FFE5BF] p-6 flex flex-col space-y-4 md:hidden z-40">
          {(!user || user.role !== 'client') && (
            <Link to="/browse" onClick={() => setMobileMenuOpen(false)} className="text-black hover:text-black text-sm font-medium">Browse Tasks</Link>
          )}
          {user ? (
            <>
              {/* Mobile Role Switcher */}
              {(user.role === 'client' || user.role === 'helper') && (
                <div className="flex justify-between items-center pb-3 border-b border-[#FFE5BF]">
                  <span className="text-xs text-black/70 font-semibold uppercase tracking-wider">Active Workspace</span>
                  <div className="flex bg-[#FFFAF3] border border-[#FFE5BF] rounded-full p-0.5 space-x-0.5">
                    <button
                      type="button"
                      onClick={() => { handleRoleSwitch('client'); setMobileMenuOpen(false); }}
                      disabled={switchingRole}
                      className={`px-3.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${
                        user.role === 'client'
                          ? 'bg-[#FFE5BF] text-black'
                          : 'text-black/70 hover:text-black'
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
                          ? 'bg-[#FFE5BF] text-black'
                          : 'text-black/70 hover:text-black'
                      } disabled:opacity-50`}
                    >
                      Helper
                    </button>
                  </div>
                </div>
              )}

              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-black hover:text-black text-sm font-medium">Dashboard</Link>
              <Link to="/inbox" onClick={() => setMobileMenuOpen(false)} className="text-black hover:text-black text-sm font-medium">Inbox</Link>
              {user.role === 'client' && (
                <Link to="/post-task" onClick={() => setMobileMenuOpen(false)} className="text-black/70 hover:text-black text-sm font-medium">Post Task</Link>
              )}
              {user.role === 'admin' && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="text-black hover:text-black text-sm font-medium font-semibold">Admin Panel</Link>
              )}
              <Link to={`/profile/${user.id}`} onClick={() => setMobileMenuOpen(false)} className="text-black hover:text-black text-sm font-medium">My Profile</Link>
              <button 
                onClick={() => { logout(); navigate('/'); setMobileMenuOpen(false); }}
                className="flex items-center space-x-2 text-rose-400 hover:text-rose-600 text-sm font-medium pt-2 border-t border-[#FFE5BF]"
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col space-y-3 pt-2 border-t border-[#FFE5BF]">
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="text-black hover:text-black text-sm font-medium text-center py-2">Sign In</Link>
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="bg-[#FFE5BF] hover:bg-[#FFE5BF] text-black rounded-full text-sm font-medium text-center py-2">Get Started</Link>
            </div>
          )}
        </div>
      )}

    </header>
  );
}
