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
    <div className="modal-overlay" style={{ zIndex: 99999, background: 'rgba(5, 8, 15, 0.88)', backdropFilter: 'blur(12px)', overflowX: 'hidden' }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '440px',
          width: '92%',
          padding: '22px 18px',
          borderRadius: '20px',
          background: '#0f172a',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          textAlign: 'center',
          overflowX: 'hidden'
        }}
      >
        {/* Header con Deporte y Formato */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '4px 10px',
          borderRadius: '99px',
          marginBottom: '10px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#34d399' }}>
            {pendingMatch?.sportId?.toUpperCase()} • {pendingMatch?.formatId?.toUpperCase()}
          </span>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
          ¡Partido Encontrado!
        </h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px' }}>
          Confirma tu asistencia para ingresar a la sala de coordinación.
        </p>

        {/* Barra de Tiempo Regresiva */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '11px', fontWeight: 700 }}>
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} color="#f59e0b" /> Tiempo restante
            </span>
            <span style={{ color: timeLeft <= 5 ? '#ef4444' : '#fbbf24', fontSize: '12px', fontWeight: 800 }}>
              {timeLeft}s
            </span>
          </div>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '99px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: timeLeft <= 5 ? '#ef4444' : '#10b981',
                transition: 'width 1s linear'
              }}
            />
          </div>
        </div>

        {/* Contador de Aceptados */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '14px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span>Confirmados: <strong style={{ color: '#34d399' }}>{acceptedCount}</strong> de {totalPlayers}</span>
          </div>

          <div
            className="accept-teams-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: '8px',
              textAlign: 'left',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {/* Mi Equipo */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.04)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: '10px',
              padding: '8px',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#34d399', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tu Equipo ({myTeam?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
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
                        borderRadius: '6px',
                        background: isAccepted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: isAccepted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.04)',
                        minWidth: 0,
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                        <img
                          src={p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                          alt={p.name}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: `1px solid ${isAccepted ? '#10b981' : '#64748b'}`,
                            flexShrink: 0
                          }}
                        />
                        <span
                          title={`${p.name} ${pId === currentUserId ? '(Tú)' : ''}`}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: isAccepted ? '#fff' : '#94a3b8',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1,
                            minWidth: 0
                          }}
                        >
                          {p.name} {pId === currentUserId && '(Tú)'}
                        </span>
                      </div>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: isAccepted ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isAccepted ? <Check size={10} color="#042416" strokeWidth={3} /> : <Clock size={9} color="#64748b" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Equipo Rival */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.04)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '10px',
              padding: '8px',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#f87171', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Rival ({rivalTeam?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
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
                        borderRadius: '6px',
                        background: isAccepted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: isAccepted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.04)',
                        minWidth: 0,
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                        <img
                          src={p.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80'}
                          alt={p.name}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: `1px solid ${isAccepted ? '#10b981' : '#64748b'}`,
                            flexShrink: 0
                          }}
                        />
                        <span
                          title={p.name}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: isAccepted ? '#fff' : '#94a3b8',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1,
                            minWidth: 0
                          }}
                        >
                          {p.name}
                        </span>
                      </div>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: isAccepted ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isAccepted ? <Check size={10} color="#042416" strokeWidth={3} /> : <Clock size={9} color="#64748b" />}
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
              width: '100%',
              padding: '13px',
              fontSize: '14px',
              fontWeight: 800,
              borderRadius: '12px',
              border: 'none',
              cursor: isUserAccepted ? 'default' : 'pointer',
              background: isUserAccepted ? 'rgba(16, 185, 129, 0.15)' : '#10b981',
              color: isUserAccepted ? '#34d399' : '#042416',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {isUserAccepted ? (
              <>
                <Check size={16} />
                <span>Confirmado • Esperando rivales...</span>
              </>
            ) : (
              <span>Confirmar Asistencia</span>
            )}
          </button>

          <button
            onClick={onDecline}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px',
              cursor: 'pointer'
            }}
          >
            Rechazar y salir
          </button>
        </div>
      </div>
    </div>
  );
}
