import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error atrapado en ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#080c14',
          color: '#fff',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#f87171' }}>
            Algo salió mal al cargar la pantalla
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '400px', marginBottom: '16px' }}>
            {this.state.error?.message || 'Error desconocido'}
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: '#10b981',
              color: '#000',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Limpiar Datos y Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
