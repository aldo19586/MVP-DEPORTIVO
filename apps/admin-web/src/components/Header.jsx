import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Users, Radio, Clock, ShieldCheck } from 'lucide-react';
import { adminSocket } from '../services/socket';

export default function Header({ onlineCount = 0, disputesCount = 0, activeMatchesCount = 0 }) {
  const [socketConnected, setSocketConnected] = useState(adminSocket.connected);
  const [time, setTime] = useState(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    adminSocket.on('connect', onConnect);
    adminSocket.on('disconnect', onDisconnect);

    return () => {
      clearInterval(interval);
      adminSocket.off('connect', onConnect);
      adminSocket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <header style={{
      height: '68px',
      backgroundColor: '#0b111d',
      borderBottom: '1px solid #1e293b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '900',
            fontSize: '18px',
            color: '#080c14'
          }}>
            ⚡
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '16px', letterSpacing: '-0.01em' }}>
              MATCHSPORT <span style={{ color: '#10b981' }}>SUPERADMIN</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
              Command Center 1080p • Lima, Perú
            </div>
          </div>
        </div>

        {/* Realtime Socket Heartbeat Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '9999px',
          backgroundColor: socketConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${socketConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          <span className="pulse-indicator" style={{ backgroundColor: socketConnected ? '#10b981' : '#ef4444' }} />
          <span style={{ fontSize: '12px', fontWeight: '700', color: socketConnected ? '#10b981' : '#ef4444' }}>
            {socketConnected ? 'SOCKET ONLINE (2.5s PING)' : 'SOCKET DESCONECTADO'}
          </span>
        </div>
      </div>

      {/* Top Quick Status Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '8px',
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b'
        }}>
          <Users size={16} color="#06b6d4" />
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>En Línea:</span>
          <strong style={{ fontSize: '14px', color: '#f8fafc' }}>{onlineCount}</strong>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '8px',
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b'
        }}>
          <Activity size={16} color="#10b981" />
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Partidos en Cancha:</span>
          <strong style={{ fontSize: '14px', color: '#10b981' }}>{activeMatchesCount}</strong>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '8px',
          backgroundColor: disputesCount > 0 ? 'rgba(239, 68, 68, 0.15)' : '#0f172a',
          border: `1px solid ${disputesCount > 0 ? 'rgba(239, 68, 68, 0.4)' : '#1e293b'}`
        }}>
          <ShieldAlert size={16} color={disputesCount > 0 ? '#ef4444' : '#64748b'} />
          <span style={{ fontSize: '13px', color: disputesCount > 0 ? '#fca5a5' : '#94a3b8' }}>Disputas:</span>
          <strong style={{ fontSize: '14px', color: disputesCount > 0 ? '#ef4444' : '#f8fafc' }}>{disputesCount}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', marginLeft: '12px' }}>
          <Clock size={15} />
          <span>{time}</span>
        </div>
      </div>
    </header>
  );
}
