import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowRight, BookOpen, ShieldCheck, Wallet, Sparkles, CheckCircle2, 
  MessageSquareCode, Award, Users, Star, ArrowUpRight 
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();

  const stats = [
    { label: "Helper Rating Avg", value: "4.9★", icon: <Star className="text-[#AC8968]" size={18} /> },
    { label: "Active Student Solvers", value: "1,200+", icon: <Users className="text-[#AC8968]" size={18} /> },
    { label: "Tasks Solved", value: "3,500+", icon: <BookOpen className="text-[#93785B]" size={18} /> },
  ];

  const clientFeatures = [
    "Post assignments, design reports, or request coding aid",
    "Set your own budget and deadline",
    "View bid lists, skills portfolios, and handwriting samples",
    "Review and approve deliverables once completed",
  ];

  const helperFeatures = [
    "Place proposals on programming, tutoring, or PPT design tasks",
    "Collaborate on a flexible schedule",
    "Showcase skills and gain rating testimonials",
    "Build your profile portfolio and gain academic recognition",
  ];

  const steps = [
    { title: "Post a Task", desc: "Define your assignment, budget, and deadline. Our AI reviews description for fair guidelines.", step: "01" },
    { title: "Review Bids", desc: "Helpers offer competitive proposals. Chat via real-time messenger and check portfolios.", step: "02" },
    { title: "Helper Starts Work", desc: "Accept the best proposal and let the helper begin working on your assignment.", step: "03" },
    { title: "Approve Deliverables", desc: "Review helper submission file alongside AI grammar/plagiarism checks, approve work once satisfied.", step: "04" },
  ];

  const faqs = [
    { q: "Is StudySwap an academic cheating platform?", a: "No. StudySwap is designed for study aid, tutoring assistance, data curation, presentation templates design, research support, and custom coding tutoring. Sharing exam answers or bypassing integrity is blocked by our scam detection scanner." },
    { q: "How is the collaboration managed?", a: "When you accept a bid, the task is locked to that helper. The helper works on your deliverables and submits them. You can inspect, request revisions, and approve them once satisfied." },
    { q: "What if the completed work needs revisions?", a: "You can request revisions in the submission portal. The helper will be notified to review comments and upload updated files. Disputes can be reported to admins for final resolution." },
  ];

  return (
    <div className="space-y-24 py-6">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto space-y-8 pt-10 overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="blob-indigo -top-20 -left-40 opacity-60" />
        <div className="blob-purple -top-10 -right-32 opacity-50" />
        <div className="blob-emerald top-40 left-1/2 -translate-x-1/2 opacity-40" />

        <div className="animate-fade-in-down inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#1A1714]/45 border border-[#3E362E]/40 text-xs font-semibold text-[#D4C4B0] animate-pulse-glow">
          <Sparkles size={13} className="animate-float" />
          <span>Peer-to-Peer Student Academic Assistance Platform</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] font-display animate-fade-in-up delay-100">
          Connect with skilled peers for <br />
          <span className="text-gradient-animated">academic collaboration</span>
        </h1>
        
        <p className="text-base md:text-lg text-[#A69080] max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
          Need help preparing seminar reports, designing presentation slides, debugged scripts, or custom tutoring? Post a task and find verified student helpers instantly.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-in-up delay-300">
          <Link 
            to={user ? "/dashboard" : "/auth"}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#865D36] hover:bg-[#93785B] text-white font-bold text-sm shadow-xl shadow-[#865D36]/20 flex items-center justify-center space-x-2 group btn-ripple hover-scale"
          >
            <span>{user ? 'Go to Dashboard' : 'Get Started Now'}</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            to="/browse"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#2A2420] hover:bg-[#3E362E] border border-[#3E362E] text-[#E8DDD0] text-sm font-bold flex items-center justify-center space-x-2"
          >
            <span>Browse Available Tasks</span>
            <ArrowUpRight size={16} />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 max-w-3xl mx-auto">
          {stats.map((s, idx) => (
            <div key={idx} className="glass p-5 rounded-2xl border border-[#3E362E] flex items-center space-x-4 hover-lift hover-shine hover-glow animate-fade-in-up" style={{ animationDelay: `${400 + idx * 150}ms` }}>
              <div className="p-3 rounded-xl bg-[#2A2420] border border-[#3E362E]">
                {s.icon}
              </div>
              <div className="text-left">
                <div className="text-xl font-bold font-display text-white">{s.value}</div>
                <div className="text-xs text-[#A69080] font-medium">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pathways / Dual Feature Cards */}
      <section className="space-y-12">
        <div className="text-center space-y-2 animate-fade-in-up">
          <h2 className="text-3xl font-bold font-display">A Dedicated Ecosystem for Students</h2>
          <p className="text-sm text-[#A69080]">Whether you need help or want to share your expertise, StudySwap has you covered.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Clients */}
          <div className="glass p-8 rounded-3xl border border-[#3E362E] flex flex-col justify-between hover:border-[#573D23]/60 transition group hover-lift hover-shine animate-fade-in-left delay-200">
            <div className="space-y-6">
              <div className="h-12 w-12 rounded-2xl bg-[#1A1714]/40 border border-[#3E362E]/40 flex items-center justify-center text-[#AC8968]">
                <BookOpen size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold font-display group-hover:text-[#AC8968] transition-colors">Post & Collaborate (Clients)</h3>
                <p className="text-xs text-[#A69080] leading-relaxed">
                  Stuck with assignment reports, presentation layouts, or complex programming debugs? Hire top-rated seniors or peers to guide you.
                </p>
              </div>
              <ul className="space-y-3 pt-2">
                {clientFeatures.map((f, i) => (
                  <li key={i} className="flex items-start space-x-2 text-xs text-[#D4C4B0]">
                    <CheckCircle2 size={15} className="text-[#AC8968] shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-8">
              <Link 
                to={user?.role === 'client' ? '/post-task' : '/auth'}
                className="inline-flex items-center space-x-2 text-xs font-bold text-[#AC8968] hover:text-[#D4C4B0] transition-colors"
              >
                <span>Create your first task posting</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Card 2: Helpers */}
          <div className="glass p-8 rounded-3xl border border-[#3E362E] flex flex-col justify-between hover:border-[#573D23]/60 transition group hover-lift hover-shine animate-fade-in-right delay-300">
            <div className="space-y-6">
              <div className="h-12 w-12 rounded-2xl bg-[#1A1714]/40 border border-[#3E362E]/40 flex items-center justify-center text-[#93785B]">
                <MessageSquareCode size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold font-display group-hover:text-[#93785B] transition-colors">Collaborate & Teach (Helpers)</h3>
                <p className="text-xs text-[#A69080] leading-relaxed">
                  Have subject expertise in programming, graphic design, math tutoring, or writing? Help junior peers and build your portfolio.
                </p>
              </div>
              <ul className="space-y-3 pt-2">
                {helperFeatures.map((f, i) => (
                  <li key={i} className="flex items-start space-x-2 text-xs text-[#D4C4B0]">
                    <CheckCircle2 size={15} className="text-[#93785B] shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-8">
              <Link 
                to="/browse"
                className="inline-flex items-center space-x-2 text-xs font-bold text-[#93785B] hover:text-[#AC8968] transition-colors"
              >
                <span>Browse available tasks to bid</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="space-y-16">
        <div className="text-center space-y-2 animate-fade-in-up">
          <h2 className="text-3xl font-bold font-display">How StudySwap Works</h2>
          <p className="text-sm text-[#A69080]">Secure escrow collaboration flow from posting to release.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, idx) => (
            <div key={idx} className="glass p-6 rounded-2xl border border-[#3E362E] relative hover:border-[#573D23] transition card-3d hover-glow animate-fade-in-up" style={{ animationDelay: `${idx * 150}ms` }}>
              <div className="text-3xl font-black font-display text-[#93785B]/20 absolute top-4 right-4">{s.step}</div>
              <h3 className="text-sm font-bold font-display text-[#E8DDD0] mb-2 mt-4">{s.title}</h3>
              <p className="text-xs text-[#A69080] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto space-y-8">
        <h2 className="text-3xl font-bold font-display text-center animate-fade-in-up">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="glass p-6 rounded-2xl border border-[#3E362E] space-y-2 hover-glow hover-lift animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
              <h3 className="font-semibold text-[#E8DDD0] text-sm font-display">{faq.q}</h3>
              <p className="text-xs text-[#A69080] leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
