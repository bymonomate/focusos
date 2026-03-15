import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Runtime render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return React.createElement(
        'div',
        {
          style: {
            minHeight: '100vh',
            padding: '24px',
            background: '#fff',
            color: '#111',
            fontFamily: 'system-ui, sans-serif',
            whiteSpace: 'pre-wrap',
          },
        },
        React.createElement('h1', { style: { fontSize: '20px', marginBottom: '12px' } }, '앱 런타임 오류가 발생했어요'),
        React.createElement('div', { style: { fontWeight: 600, marginBottom: '8px' } }, String(this.state.error?.message || this.state.error)),
        React.createElement('pre', { style: { fontSize: '12px', lineHeight: 1.5, background: '#f5f5f5', padding: '12px', borderRadius: '12px', overflow: 'auto' } }, String(this.state.error?.stack || 'stack unavailable'))
      );
    }
    return this.props.children;
  }
}

window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;padding:24px;background:#fff;color:#111;font-family:system-ui,sans-serif;white-space:pre-wrap;">
      <h1 style="font-size:20px;margin-bottom:12px;">전역 오류가 발생했어요</h1>
      <div style="font-weight:600;margin-bottom:8px;">${String(event.error?.message || event.message || 'Unknown error')}</div>
      <pre style="font-size:12px;line-height:1.5;background:#f5f5f5;padding:12px;border-radius:12px;overflow:auto;">${String(event.error?.stack || '')}</pre>
    </div>
  `;
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (error) {
      console.error('Failed to clear service workers/caches:', error);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(ErrorBoundary, null, React.createElement(App))
  )
);
