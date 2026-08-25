import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFAF3', color: '#000', padding: '24px', fontFamily: 'sans-serif' }}>
          <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '32px', backgroundColor: '#FFF2DB', borderRadius: '24px', border: '1px solid #FFE5BF' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>BhaiPlz Session Issue</h2>
            <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '20px' }}>Something went wrong loading this session. Click below to reload.</p>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{ padding: '10px 20px', borderRadius: '12px', backgroundColor: '#FFE5BF', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              Reset Session & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  } else {
    console.error("Failed to find root DOM element.");
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
