import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';

// Pages
import LandingPage from './pages/LandingPage';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import PostTask from './pages/PostTask';
import BrowseTasks from './pages/BrowseTasks';
import TaskDetails from './pages/TaskDetails';
import Chat from './pages/Chat';
import Inbox from './pages/Inbox';
import Submission from './pages/Submission';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#070a13] text-indigo-400">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
          <p className="font-semibold text-sm">Synchronizing credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function MainApp() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#070a13] text-indigo-400">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
          <p className="font-semibold text-sm">Authenticating platform session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-premium flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/browse" element={<BrowseTasks />} />
          <Route path="/profile/:id" element={<Profile />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/post-task" element={
            <ProtectedRoute allowedRoles={['client']}>
              <PostTask />
            </ProtectedRoute>
          } />
          
          <Route path="/tasks/:id" element={
            <ProtectedRoute>
              <TaskDetails />
            </ProtectedRoute>
          } />
          
          <Route path="/chat/:taskId/:receiverId" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />

          <Route path="/inbox" element={
            <ProtectedRoute>
              <Inbox />
            </ProtectedRoute>
          } />
          
          <Route path="/submission/:taskId/:submissionId" element={
            <ProtectedRoute>
              <Submission />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="py-6 border-t border-slate-900 bg-slate-950/20 text-center text-xs text-slate-500">
        <p>© 2026 StudySwap Platform. Student-to-Student Escrow Academic Collaboration Marketplace.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <MainApp />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}
