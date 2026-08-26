import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react';

export default function CompleteProfile() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name && !user?.full_name?.includes('@') ? user.full_name : '');
  const [college, setCollege] = useState(user?.college || '');
  const [course, setCourse] = useState(user?.course || '');
  const [academicYear, setAcademicYear] = useState(user?.academic_year || '1st Year');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await updateProfile({
        fullName,
        college,
        course,
        academicYear,
        bio: user?.bio || '',
        skills: user?.skills || ''
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to save profile details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-md w-full glass rounded-3xl p-8 border border-[#FFE5BF] shadow-2xl space-y-6 animate-scale-in">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FFFAF3] border border-[#FFE5BF] text-xs font-semibold text-black">
            <Sparkles size={13} className="text-[#865D36]" />
            <span>Welcome to BroPlz!</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-black">
            Complete Your Profile
          </h2>
          <p className="text-xs text-black/70 leading-relaxed">
            Please fill in your student details to personalize your experience before exploring the platform.
          </p>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-100/30 border border-rose-300 flex items-start space-x-2 text-rose-600 text-xs">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Onboarding Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-black/80 mb-1.5">
              Full Name
            </label>
            <input 
              type="text" 
              placeholder="e.g. Priyanshu Sharma"
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#FFFAF3]/80 border border-[#FFE5BF] focus:border-black focus:outline-none text-xs text-black shadow-inner"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-black/80 mb-1.5">
                College
              </label>
              <input 
                type="text" 
                placeholder="e.g. DTU Delhi"
                value={college} 
                onChange={(e) => setCollege(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FFFAF3]/80 border border-[#FFE5BF] focus:border-black focus:outline-none text-xs text-black shadow-inner"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-black/80 mb-1.5">
                Course
              </label>
              <input 
                type="text" 
                placeholder="e.g. B.Tech CSE"
                value={course} 
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FFFAF3]/80 border border-[#FFE5BF] focus:border-black focus:outline-none text-xs text-black shadow-inner"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-black/80 mb-1.5">
              Academic Year
            </label>
            <select
              value={academicYear} 
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#FFFAF3]/80 border border-[#FFE5BF] focus:border-black focus:outline-none text-xs text-black font-semibold shadow-inner cursor-pointer"
            >
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
              <option value="Staff">Staff</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-[#FFE5BF] hover:brightness-105 text-black text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-[#FFE5BF]/40 disabled:opacity-50 mt-6"
          >
            <span>{loading ? 'Saving Profile...' : 'Save & Start Exploring'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

      </div>
    </div>
  );
}
