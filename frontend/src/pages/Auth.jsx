import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Sparkles, BookOpen, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function Auth() {
  const { login, register, error: authError } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');
  const [academicYear, setAcademicYear] = useState('1st Year');
  const [role, setRole] = useState('client'); // 'client' or 'helper'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        navigate('/dashboard');
      } else {
        const result = await register({
          email,
          password,
          fullName,
          college,
          course,
          academicYear,
          role
        });
        if (result && result.requiresConfirmation) {
          setSuccessMessage('Registration successful! Please check your email inbox to confirm your account, then sign in.');
          setIsLogin(true); // Switch to sign in tab
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setLocalError(err.message || 'Authentication failed. Please verify inputs.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="max-w-md w-full mx-auto py-10">
      <div className="glass rounded-3xl p-8 border border-slate-800 shadow-2xl space-y-6 animate-scale-in hover-glow">
        
        {/* Header */}
        <div className="text-center space-y-2 animate-fade-in-up delay-100">
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-indigo-950/40 border border-indigo-800/40 text-[10px] font-semibold text-indigo-300 animate-pulse-glow">
            <Sparkles size={11} className="animate-float" />
            <span>Secure Credentials Gateway</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-white">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-xs text-slate-400">
            {isLogin ? 'Collaborate with student peers today' : 'Join our educational collaboration hub'}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-900">
          <button 
            onClick={() => { setIsLogin(true); setLocalError(null); setSuccessMessage(null); }}
            className={`py-2 rounded-lg text-xs font-semibold transition ${isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sign In
          </button>
          <button 
            onClick={() => { setIsLogin(false); setLocalError(null); setSuccessMessage(null); }}
            className={`py-2 rounded-lg text-xs font-semibold transition ${!isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Create Account
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/50 flex items-start space-x-2 text-emerald-300 text-xs leading-normal">
            <ShieldCheck size={16} className="shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {(localError || authError) && (
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/50 flex items-start space-x-2 text-rose-300 text-xs leading-normal animate-pulse">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{localError || authError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {!isLogin && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Full Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Priyanshu Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-white"
                  required
                />
              </div>

              {/* College & Course */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">College</label>
                  <input 
                    type="text"
                    placeholder="e.g. DTU Delhi"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Course</label>
                  <input 
                    type="text"
                    placeholder="e.g. B.Tech CSE"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-white"
                    required
                  />
                </div>
              </div>

              {/* Academic Year Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Academic Year</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-300 font-semibold"
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

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">College Email Address</label>
            <input 
              type="email"
              placeholder="name@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-white"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
            <input 
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-white"
              required
            />
          </div>

          {/* Submit */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-900/40 disabled:opacity-50 mt-6"
          >
            {isLogin ? <LogIn size={15} /> : <UserPlus size={15} />}
            <span>{loading ? 'Validating credentials...' : (isLogin ? 'Sign In to Account' : 'Register Account')}</span>
          </button>
        </form>


      </div>
    </div>
  );
}
