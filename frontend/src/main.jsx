import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || String(this.state.error) || 'Unknown error';
      const errStack = this.state.error?.stack || '';
      const componentStack = this.state.errorInfo?.componentStack || '';
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFAF3', color: '#000', padding: '24px', fontFamily: 'sans-serif' }}>
          <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', padding: '32px', backgroundColor: '#FFF2DB', borderRadius: '24px', border: '1px solid #FFE5BF' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>BroPlz Session Issue</h2>
            <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '16px' }}>Something went wrong. Error details below (share with developer):</p>
            <div style={{ backgroundColor: '#fff', border: '1px solid #f0c9a0', borderRadius: '8px', padding: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '11px', fontFamily: 'monospace', maxHeight: '200px', overflowY: 'auto', wordBreak: 'break-all' }}>
              <strong>Error:</strong> {errMsg}<br/><br/>
              {errStack && <><strong>Stack:</strong><br/>{errStack.split('\n').slice(0,5).join('\n')}<br/><br/></>}
              {componentStack && <><strong>Component:</strong><br/>{componentStack.split('\n').slice(0,5).join('\n')}</>}
            </div>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{ padding: '10px 20px', borderRadius: '12px', backgroundColor: '#FFE5BF', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              Reset Session &amp; Reload
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
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
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
