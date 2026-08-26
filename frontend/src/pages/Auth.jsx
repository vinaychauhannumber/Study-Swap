import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Sparkles, ShieldAlert, ShieldCheck, Mail, Key } from 'lucide-react';

export default function Auth() {
  const { login, register, forgotPassword, resetPassword, loginWithGoogle, error: authError } = useAuth();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'forgot', 'reset'
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [resetToken, setResetToken] = useState(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');
  const [academicYear, setAcademicYear] = useState('1st Year');
  const [role, setRole] = useState('client');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token') && hash.includes('type=recovery')) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const token = hashParams.get('access_token');
      if (token) {
        setAuthMode('reset');
        setResetToken(token);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (authMode === 'login') {
        await login(email, password);
        navigate('/dashboard');
      } else if (authMode === 'register') {
        const result = await register({
          email, password, fullName, college, course, academicYear, role
        });
        if (result && result.requiresConfirmation) {
          setSuccessMessage('Registration successful! Please check your email inbox to confirm your account, then sign in.');
          setAuthMode('login');
        } else {
          navigate('/dashboard');
        }
      } else if (authMode === 'forgot') {
        await forgotPassword(email, window.location.origin + '/auth');
        setSuccessMessage('Password reset link sent! Please check your email inbox (and spam folder).');
        // Do not switch to login so they can clearly see the success message
      } else if (authMode === 'reset') {
        await resetPassword(resetToken, password);
        setSuccessMessage('Password updated successfully! You can now sign in.');
        setAuthMode('login');
        window.history.replaceState(null, '', window.location.pathname); // Clear hash
      }
    } catch (err) {
      setLocalError(err.message || 'Authentication failed. Please verify inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto py-10">
      <div className="glass rounded-3xl p-8 border border-[#FFE5BF] shadow-2xl space-y-6 animate-scale-in hover-glow">
        
        {/* Header */}
        <div className="text-center space-y-2 animate-fade-in-up delay-100">
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#FFFAF3]/40 border border-[#FFE5BF]/40 text-[10px] font-semibold text-black animate-pulse-glow">
            <Sparkles size={11} className="animate-float" />
            <span>Secure Credentials Gateway</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-black">
            {authMode === 'login' && 'Welcome back'}
            {authMode === 'register' && 'Create an account'}
            {authMode === 'forgot' && 'Reset Password'}
            {authMode === 'reset' && 'Set New Password'}
          </h2>
          <p className="text-xs text-black/70">
            {authMode === 'login' && 'Collaborate with student peers today'}
            {authMode === 'register' && 'Join our educational collaboration hub'}
            {authMode === 'forgot' && 'We will send you a secure reset link'}
            {authMode === 'reset' && 'Enter your new secure password'}
          </p>
        </div>

        {/* Tab Selector (only for login/register) */}
        {(authMode === 'login' || authMode === 'register') && (
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#FFFAF3] border border-[#FFE5BF]">
            <button 
              type="button"
              onClick={() => { setAuthMode('login'); setLocalError(null); setSuccessMessage(null); }}
              className={`py-2 rounded-lg text-xs font-semibold transition ${authMode === 'login' ? 'bg-[#FFE5BF] text-black shadow-md' : 'text-black/70 hover:text-black'}`}
            >
              Sign In
            </button>
            <button 
              type="button"
              onClick={() => { setAuthMode('register'); setLocalError(null); setSuccessMessage(null); }}
              className={`py-2 rounded-lg text-xs font-semibold transition ${authMode === 'register' ? 'bg-[#FFE5BF] text-black shadow-md' : 'text-black/70 hover:text-black'}`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Google OAuth Button */}
        {(authMode === 'login' || authMode === 'register') && (
          <div className="space-y-4 pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setLocalError(null);
                try {
                  await loginWithGoogle();
                } catch (err) {
                  setLocalError(err.message || 'Google authentication failed.');
                }
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#FFFAF3] hover:bg-[#FFF2DB] border border-[#FFE5BF] text-black text-xs font-bold flex items-center justify-center space-x-2.5 transition shadow-sm hover-scale disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{authMode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-[#FFE5BF] w-full" />
              <span className="bg-[#FFF2DB] px-3 text-[10px] uppercase font-bold text-black/50 absolute">Or continue with email</span>
            </div>
          </div>
        )}




        {/* Alerts */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-[#FFFAF3]/20 border border-[#FFE5BF]/50 flex items-start space-x-2 text-black/70 text-xs leading-normal">
            <ShieldCheck size={16} className="shrink-0 mt-0.5 text-black" />
            <span>{successMessage}</span>
          </div>
        )}

        {(() => {
          const rawErr = localError || authError;
          if (!rawErr) return null;
          let displayMsg = '';
          if (typeof rawErr === 'string') displayMsg = rawErr;
          else if (typeof rawErr.message === 'string') displayMsg = rawErr.message;
          else if (typeof rawErr.error === 'string') displayMsg = rawErr.error;
          else displayMsg = JSON.stringify(rawErr);

          if (!displayMsg || displayMsg === '{}' || displayMsg === 'null' || displayMsg === 'undefined') {
            displayMsg = 'Authentication failed. Please verify your email and password or switch to Create Account.';
          }

          return (
            <div className="p-3.5 rounded-xl bg-rose-100/20 border border-rose-300/50 flex items-start space-x-2 text-rose-600 text-xs leading-normal animate-pulse">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{displayMsg}</span>
            </div>
          );
        })()}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {authMode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-black/70 mb-1.5">Full Name</label>
                <input 
                  type="text" placeholder="e.g. Priyanshu Sharma"
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFAF3]/60 border border-[#FFE5BF] focus:border-black focus:outline-none text-xs text-black"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-black/70 mb-1.5">College</label>
                  <input 
                    type="text" placeholder="e.g. DTU Delhi"
                    value={college} onChange={(e) => setCollege(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FFFAF3]/60 border border-[#FFE5BF] focus:border-black focus:outline-none text-xs text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-black/70 mb-1.5">Course</label>
                  <input 
                    type="text" placeholder="e.g. B.Tech CSE"
                    value={course} onChange={(e) => setCourse(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FFFAF3]/60 border border-[#FFE5BF] focus:border-black focus:outline-none text-xs text-black"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-black/70 mb-1.5">Academic Year</label>
                <select
                  value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FFFAF3]/60 border border-[#FFE5BF] focus:border-black focus:outline-none text-xs text-black font-semibold"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
            </>
          )}

          {(authMode === 'login' || authMode === 'register' || authMode === 'forgot') && (
            <div>
              <label className="block text-xs font-semibold text-black/70 mb-1.5">College Email Address</label>
              <input 
                type="email" placeholder="name@college.edu"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FFFAF3]/60 border border-[#FFE5BF] focus:border-black focus:outline-none text-xs text-black"
                required
              />
            </div>
          )}

          {(authMode === 'login' || authMode === 'register' || authMode === 'reset') && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-black/70">
                  {authMode === 'reset' ? 'New Password' : 'Password'}
                </label>
                {authMode === 'login' && (
                  <button 
                    type="button" 
                    onClick={() => { setAuthMode('forgot'); setLocalError(null); setSuccessMessage(null); }}
                    className="text-[10px] text-black/70 hover:text-black transition"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input 
                type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FFFAF3]/60 border border-[#FFE5BF] focus:border-black focus:outline-none text-xs text-black"
                required
              />
            </div>
          )}

          <button 
            type="submit" disabled={loading}
            className="w-full py-3 rounded-full bg-[#FFE5BF] hover:brightness-110 text-black text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-lg shadow-[#FFE5BF]/40 disabled:opacity-50 mt-6"
          >
            {authMode === 'login' && <LogIn size={15} />}
            {authMode === 'register' && <UserPlus size={15} />}
            {authMode === 'forgot' && <Mail size={15} />}
            {authMode === 'reset' && <Key size={15} />}
            
            <span>
              {loading ? 'Processing...' : 
                authMode === 'login' ? 'Sign In to Account' : 
                authMode === 'register' ? 'Register Account' : 
                authMode === 'forgot' ? 'Send Reset Link' : 'Set New Password'}
            </span>
          </button>
          
          {(authMode === 'forgot' || authMode === 'reset') && (
            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => { setAuthMode('login'); setLocalError(null); setSuccessMessage(null); }}
                className="text-[10px] text-black/70 hover:text-black transition"
              >
                &larr; Back to Sign In
              </button>
            </div>
          )}
        </form>

      </div>
    </div>
  );
}
