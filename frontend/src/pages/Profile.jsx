import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, API_BASE } from '../context/AuthContext';
import { 
  User, Mail, GraduationCap, Code, FileText, CheckCircle, 
  Star, Settings2, Sparkles, Image, Check, AlertCircle, Award 
} from 'lucide-react';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser, token, updateProfile } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');
  const [academicYear, setAcademicYear] = useState('1st Year');

  // File upload states
  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadingSample, setUploadingSample] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE}/users/profile/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load profile.');
      
      setProfileUser(data.user);
      setReviews(data.reviews || []);

      // Prepopulate edit states if this is current user
      if (Number(id) === Number(currentUser?.id)) {
        setFullName(data.user.full_name || '');
        setBio(data.user.bio || '');
        setSkills(data.user.skills || '');
        setCollege(data.user.college || '');
        setCourse(data.user.course || '');
        setAcademicYear(data.user.academic_year || '1st Year');
      }
    } catch (err) {
      setError(err.message || 'Error loading profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id, currentUser]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const updatedUser = await updateProfile({
        fullName,
        bio,
        skills,
        college,
        course,
        academicYear
      });
      setProfileUser(updatedUser);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err.message || 'Profile update failed.');
    }
  };

  const handleSampleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'profile_picture') setUploadingPic(true);
    else setUploadingSample(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await fetch(`${API_BASE}/users/upload-sample`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');

      alert(`${type === 'profile_picture' ? 'Profile picture' : 'Handwriting sample'} uploaded successfully!`);
      fetchProfile();
    } catch (err) {
      alert(err.message);
    } finally {
      if (type === 'profile_picture') setUploadingPic(false);
      else setUploadingSample(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-400">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mr-2"></div>
        <span className="font-semibold text-sm">Mapping scholar records...</span>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="max-w-2xl mx-auto py-10 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-300 text-xs">
          {error || 'User profile not found.'}
        </div>
        <Link to="/" className="inline-block text-xs text-indigo-400 hover:underline">
          Return to dashboard
        </Link>
      </div>
    );
  }

  const isMe = currentUser && Number(profileUser.id) === Number(currentUser.id);
  const skillsArray = profileUser.skills ? profileUser.skills.split(',').map(s => s.trim()) : [];

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-8">
      
      {/* Profile Overview Card */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>

        {/* Profile Pic Widget */}
        <div className="relative shrink-0 group">
          {profileUser.profile_picture ? (
            <img 
              src={`http://localhost:5005${profileUser.profile_picture}`} 
              alt={profileUser.full_name} 
              className="w-28 h-28 rounded-3xl border border-slate-700 object-cover"
            />
          ) : (
            <div className="w-28 h-28 rounded-3xl bg-indigo-950/50 border border-slate-700 flex items-center justify-center text-indigo-400 text-3xl font-black font-display">
              {profileUser.full_name.charAt(0)}
            </div>
          )}

          {isMe && (
            <label className="absolute inset-0 bg-black/70 rounded-3xl opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center cursor-pointer text-white text-[10px] font-bold">
              <input 
                type="file" 
                onChange={(e) => handleSampleUpload(e, 'profile_picture')}
                className="hidden"
                disabled={uploadingPic}
              />
              <Image size={16} className="mb-1 text-indigo-400" />
              <span>{uploadingPic ? 'Uploading...' : 'Update Avatar'}</span>
            </label>
          )}
        </div>

        {/* User Info details */}
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="space-y-1">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h2 className="text-2xl font-bold font-display text-white">{profileUser.full_name}</h2>
              <span className="text-[9px] font-bold bg-slate-900 border border-slate-800 text-indigo-400 px-2 py-0.5 rounded uppercase tracking-wider">
                {profileUser.role} Account
              </span>
            </div>
            
            <p className="text-xs text-indigo-300 font-semibold flex items-center justify-center md:justify-start space-x-1">
              <GraduationCap size={15} />
              <span>{profileUser.college} • {profileUser.course} ({profileUser.academic_year})</span>
            </p>
          </div>

          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed whitespace-pre-wrap">
            {profileUser.bio || 'This student has not updated their bio details yet.'}
          </p>

          {/* Edit Profile button */}
          {isMe && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <Settings2 size={13} />
              <span>Edit Scholar Profile</span>
            </button>
          )}
        </div>

        {/* Rating Testimonials Score */}
        <div className="flex flex-row md:flex-col items-center justify-center gap-4 shrink-0 p-4 rounded-2xl bg-slate-900/60 border border-slate-850">
          <div className="text-center">
            <div className="text-2xl font-black font-display text-white">{profileUser.rating?.toFixed(1)} ★</div>
            <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Average Rating</div>
          </div>
          <div className="w-px md:w-8 h-8 md:h-px bg-slate-800"></div>
          <div className="text-center">
            <div className="text-xl font-bold font-display text-slate-300">{profileUser.completed_tasks}</div>
            <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Tasks Done</div>
          </div>
        </div>
      </div>

      {/* Grid: Forms / Skills vs. Testimonials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Skills & Handwriting portfolio */}
        <section className="space-y-6">
          {/* Skills list */}
          <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold font-display text-indigo-400 uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-900">
              <Code size={14} />
              <span>Subject Expertise</span>
            </h3>
            <div className="flex flex-wrap gap-2 pt-1">
              {skillsArray.length === 0 ? (
                <span className="text-xs text-slate-500">No skill areas verified.</span>
              ) : (
                skillsArray.map((skill, idx) => (
                  <span key={idx} className="text-[10px] font-medium bg-indigo-950/20 border border-indigo-900/30 text-indigo-300 px-2.5 py-1 rounded-full">
                    {skill}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Handwriting Verification (crucial for exam notes, paper reports) */}
          {profileUser.role === 'helper' && (
            <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold font-display text-indigo-400 uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-900">
                <FileText size={14} />
                <span>Handwriting authenticity sample</span>
              </h3>

              {profileUser.handwriting_sample ? (
                <div className="space-y-3 pt-1">
                  <img 
                    src={`http://localhost:5005${profileUser.handwriting_sample}`} 
                    alt="Handwriting Sample" 
                    className="w-full h-40 object-cover rounded-2xl border border-slate-800"
                  />
                  {isMe && (
                    <label className="block text-center text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer pt-1">
                      <input 
                        type="file" 
                        onChange={(e) => handleSampleUpload(e, 'handwriting_sample')}
                        className="hidden"
                        disabled={uploadingSample}
                      />
                      <span>{uploadingSample ? 'Uploading...' : 'Upload new handwriting sample'}</span>
                    </label>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-850 rounded-2xl space-y-3">
                  <span className="text-[11px] text-slate-500 block font-medium">No handwriting sample verified.</span>
                  {isMe && (
                    <label className="inline-block px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer transition">
                      <input 
                        type="file" 
                        onChange={(e) => handleSampleUpload(e, 'handwriting_sample')}
                        className="hidden"
                        disabled={uploadingSample}
                      />
                      <span>Upload Handwriting Sample</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Side: Edit Form OR Reviews feed */}
        <section className="lg:col-span-2 space-y-6">
          {isEditing ? (
            <form onSubmit={handleProfileSave} className="glass p-6 md:p-8 rounded-3xl border border-indigo-900/30 space-y-4">
              <h3 className="text-sm font-bold font-display text-indigo-400">Edit Scholar Profile details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Full Name</label>
                  <input 
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Subject Skills (Comma-separated)</label>
                  <input 
                    type="text"
                    value={skills}
                    placeholder="React, Excel, PowerPoint, Solidworks"
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">College</label>
                  <input 
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Course</label>
                  <input 
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Academic Year</label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Personal Bio</label>
                <textarea 
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center space-x-1"
                >
                  <Check size={14} />
                  <span>Save Changes</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="glass p-6 md:p-8 rounded-3xl border border-slate-800 space-y-6">
              <h3 className="text-xs font-bold font-display text-indigo-400 uppercase tracking-wider pb-2 border-b border-slate-900">
                Collaboration reviews ({reviews.length})
              </h3>
              
              {reviews.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-medium">
                  No review feedback registered yet.
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-850 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                          {rev.reviewer_pic ? (
                            <img 
                              src={`http://localhost:5005${rev.reviewer_pic}`} 
                              alt={rev.reviewer_name} 
                              className="w-5 h-5 rounded-full object-cover border border-slate-800"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-indigo-950/50 border border-slate-800 flex items-center justify-center text-[10px] text-indigo-400">
                              {rev.reviewer_name.charAt(0)}
                            </div>
                          )}
                          <span>{rev.reviewer_name}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-amber-400 font-bold">
                          <span>{rev.rating}</span>
                          <Star size={11} className="fill-amber-400" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 italic leading-relaxed">
                        "{rev.comment || 'Collaborative project completed successfully.'}"
                      </p>
                      <div className="text-[9px] text-slate-500 text-right">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
