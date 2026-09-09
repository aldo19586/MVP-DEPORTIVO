import React, { useState, useEffect } from 'react';
import { Check, Clock, AlertCircle, X, Zap, ShieldCheck } from 'lucide-react';
import { soundFX } from '../utils/audio.js';

export default function MatchAcceptModal({
  pendingMatch,
  currentUserId,
  onAccept,
  onDecline
}) {
  const [hasAccepted, setHasAccepted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);

  const totalPlayers = pendingMatch?.totalPlayers || 10;
  const acceptedIds = pendingMatch?.acceptedUserIds || [];
  const acceptedCount = acceptedIds.length;
  const isAllAccepted = acceptedCount >= totalPlayers;

  const isUserAccepted = hasAccepted || acceptedIds.includes(currentUserId);

  // Cuenta regresiva de 20 segundos
  useEffect(() => {
    setTimeLeft(pendingMatch?.expiresInSeconds || 20);
    soundFX.playMatchFound();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingMatch?.pendingMatchId]);

  const handleAcceptClick = () => {
    if (hasAccepted || isUserAccepted) return;
    setHasAccepted(true);
    soundFX.playMessage();
    if (onAccept) onAccept();
  };

  const inTeamA = pendingMatch?.teamA?.some((p) => (p.userId || p.id) === currentUserId);
  const myTeam = inTeamA ? pendingMatch?.teamA : pendingMatch?.teamB;
  const rivalTeam = inTeamA ? pendingMatch?.teamB : pendingMatch?.teamA;

  const progressPercent = (timeLeft / 20) * 100;

  return (
    <div className="modal-overlay" style={{ zIndex: 99999, background: 'rgba(5, 8, 15, 0.88)', backdropFilter: 'blur(12px)' }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '460px',
          width: '94%',
          padding: '24px 20px',
          borderRadius: '24px',
          background: 'linear-gradient(180deg, #0f172a 0%, #090e17 100%)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(16, 185, 129, 0.25)',
          textAlign: 'center',
          animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* Header con Deporte y Formato */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', padding: '4px 12px', borderRadius: '20px', marginBottom: '10px' }}>
          <Zap size={14} color="#10b981" />
          <span style={{ fontSize: '11px', fontWeight: 900, color: '#34d399', letterSpacing: '0.5px' }}>
            {pendingMatch?.sportId?.toUpperCase()} • {pendingMatch?.formatId?.toUpperCase()} ({totalPlayers} JUGADORES)
          </span>
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: '0 0 4px', letterSpacing: '0.2px' }}>
          ¡PARTIDO ENCONTRADO!
        </h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px' }}>
          Confirma tu asistencia para entrar a la sala de coordinación oficial
        </p>

        {/* Barra de Tiempo Regresiva */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '11px', fontWeight: 800 }}>
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} color="#f59e0b" /> Tiempo para confirmar
            </span>
            <span style={{ color: timeLeft <= 5 ? '#ef4444' : '#fbbf24', fontSize: '13px' }}>
              {timeLeft}s
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: timeLeft <= 5 ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #10b981, #34d399)',
                transition: 'width 1s linear'
              }}
            />
          </div>
        </div>

        {/* Contador de Aceptados */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '12px',
          marginBottom: '18px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#38bdf8', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <ShieldCheck size={14} />
            <span>JUGADORES CONFIRMADOS: {acceptedCount} / {totalPlayers}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'left' }}>
            {/* Mi Equipo */}
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 900, color: '#34d399', marginBottom: '6px', textTransform: 'uppercase' }}>
                Mi Equipo ({myTeam?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {myTeam?.map((p, idx) => {
                  const pId = p.userId || p.id;
                  const isAccepted = acceptedIds.includes(pId) || (pId === currentUserId && hasAccepted);
                  return (
                    <div
                      key={pId || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        borderRadius: '8px',
                        background: isAccepted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: isAccepted ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.06)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <img
                          src={p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                          alt={p.name}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            filter: isAccepted ? 'none' : 'grayscale(80%)',
                            border: `1.5px solid ${isAccepted ? '#10b981' : '#64748b'}`
                          }}
                        />
                        <span style={{ fontSize: '11px', fontWeight: 800, color: isAccepted ? '#fff' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name} {pId === currentUserId && '(Tú)'}
                        </span>
                      </div>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: isAccepted ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isAccepted ? <Check size={12} color="#fff" /> : <Clock size={10} color="#64748b" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Equipo Rival */}
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 900, color: '#f87171', marginBottom: '6px', textTransform: 'uppercase' }}>
                Equipo Rival ({rivalTeam?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {rivalTeam?.map((p, idx) => {
                  const pId = p.userId || p.id;
                  const isAccepted = acceptedIds.includes(pId);
                  return (
                    <div
                      key={pId || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        borderRadius: '8px',
                        background: isAccepted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: isAccepted ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.06)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <img
                          src={p.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80'}
                          alt={p.name}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            filter: isAccepted ? 'none' : 'grayscale(80%)',
                            border: `1.5px solid ${isAccepted ? '#10b981' : '#64748b'}`
                          }}
                        />
                        <span style={{ fontSize: '11px', fontWeight: 800, color: isAccepted ? '#fff' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </span>
                      </div>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: isAccepted ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isAccepted ? <Check size={12} color="#fff" /> : <Clock size={10} color="#64748b" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleAcceptClick}
            disabled={isUserAccepted}
            style={{
              background: isUserAccepted
                ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: isUserAccepted ? '1px solid #10b981' : 'none',
              borderRadius: '14px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: isUserAccepted ? 'default' : 'pointer',
              boxShadow: isUserAccepted ? 'none' : '0 4px 20px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s ease',
              transform: isUserAccepted ? 'none' : 'scale(1.02)'
            }}
          >
            {isUserAccepted ? (
              <>
                <Check size={18} />
                <span>¡CONFIRMADO! ESPERANDO A LOS DEMÁS...</span>
              </>
            ) : (
              <>
                <Zap size={18} />
                <span>ACEPTAR PARTIDO</span>
              </>
            )}
          </button>

          <button
            onClick={onDecline}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: 700,
              padding: '6px',
              cursor: 'pointer'
            }}
          >
            ✕ Rechazar y volver
          </button>
        </div>
      </div>
    </div>
  );
}
