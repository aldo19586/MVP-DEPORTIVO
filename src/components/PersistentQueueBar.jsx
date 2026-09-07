import React, { useState, useEffect } from 'react';
import { Radio, X, Bell, Zap, ChevronDown, ChevronUp, Clock, ShieldCheck } from 'lucide-react';
import { requestNotificationPermission } from '../utils/audio.js';

export default function PersistentQueueBar({
  challenge,
  sportName,
  formatName,
  onCancel,
  onForceDemoMatch
}) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [hasNotifPermission, setHasNotifPermission] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasNotifPermission(Notification.permission === 'granted');
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRequestNotif = async () => {
    const granted = await requestNotificationPermission();
    setHasNotifPermission(granted);
  };

  return (
    <div className="live-notification-bar">
      {/* Barra principal compacta (Estilo Live Activity / PedidosYa) */}
      <div className="live-bar-content">
        <div className="live-pulse-wrapper">
          <div className="live-pulse-ring"></div>
          <div className="live-pulse-dot"></div>
        </div>

        <div className="live-info" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
          <div className="live-title-row">
            <span className="live-badge">EN VIVO</span>
            <span className="live-title">
              Buscando Rival: {sportName} ({formatName})
            </span>
          </div>
          <div className="live-sub">
            {challenge?.mode === 'squad' ? 'Squad incompleto • Buscando compañero' : 'Escaneando canchas y rivales en tu zona...'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="live-timer">
            {formatTime(elapsedSec)}
          </span>

          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          <button
            onClick={onCancel}
            title="Cancelar búsqueda"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Detalles expandibles (Para pruebas y configuración de notificaciones) */}
      {expanded && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> Tiempo estimado de cola:
            </span>
            <span style={{ color: '#fff', fontWeight: 600 }}>~20 a 45 segundos</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#10b981" /> Rango de rating Glicko-2:
            </span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>
              ±{Math.min(500, 180 + Math.floor(elapsedSec / 5) * 30)} pts
            </span>
          </div>

          {/* Botón de permiso para notificación en segundo plano */}
          {!hasNotifPermission && (
            <button
              onClick={handleRequestNotif}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '8px 12px', width: '100%', gap: '6px', justifyContent: 'center' }}
            >
              <Bell size={14} color="#f59e0b" />
              Activar notificación en segundo plano (para cuando cambies de app)
            </button>
          )}

          {/* Botón de match rápido de demostración */}
          <button
            onClick={onForceDemoMatch}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '8px 12px', width: '100%', gap: '6px', justifyContent: 'center' }}
          >
            <Zap size={14} />
            Simular Rival Inmediato (Prueba rápida)
          </button>
        </div>
      )}
    </div>
  );
}
