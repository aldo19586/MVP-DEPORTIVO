import React, { useState } from 'react';
import { Users, X, ArrowRight, Sparkles } from 'lucide-react';

export default function JoinLobbyModal({ onJoin, onClose }) {
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    let cleaned = inputCode.trim();
    if (!cleaned) return;

    // Si pegaron una URL completa con ?lobby=...
    if (cleaned.includes('lobby=')) {
      const match = cleaned.match(/lobby=([A-Za-z0-9_-]+)/);
      if (match) {
        cleaned = match[1];
      }
    }

    cleaned = cleaned.toUpperCase();
    if (cleaned.length < 4) {
      setError('Por favor ingresa un código de sala válido (ej: FUT-4821)');
      return;
    }

    onJoin(cleaned);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-content" style={{ maxWidth: '400px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Users size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                Unirse a una Sala
              </h3>
              <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                Ingresa el código o pega el enlace recibido
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Código o Enlace de Invitación:
            </label>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value);
                setError(null);
              }}
              placeholder="Ej: FUT-8291 o pega el enlace de WhatsApp"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'monospace'
              }}
              autoFocus
            />
            {error && (
              <span style={{ fontSize: '11px', color: '#f87171', marginTop: '4px', display: 'block' }}>
                {error}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '14px',
              fontSize: '14px',
              fontWeight: 800,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>Entrar a la Sala</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
