import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email.');
      return;
    }
    // The backend handles the redirect, so if we land here it means something failed.
    // The backend redirects to /auth?verified=true on success.
    setStatus('error');
    setMessage('Invalid or expired verification link. Please register again or contact support.');
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-premium px-4">
      <div className="glass rounded-3xl p-10 max-w-md w-full border border-[#FFE5BF] shadow-2xl text-center animate-scale-in">
        {status === 'verifying' && (
          <>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying your email…</h2>
            <p className="text-gray-500 text-sm">Please wait a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Verified!</h2>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <button
              onClick={() => navigate('/auth')}
              className="btn-primary w-full py-3 rounded-xl font-semibold"
            >
              Sign In Now
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h2>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <button
              onClick={() => navigate('/auth')}
              className="btn-primary w-full py-3 rounded-xl font-semibold"
            >
              Back to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}
