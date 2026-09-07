import React, { useState, useEffect } from 'react';
import { Clock, Trophy, ChevronDown, ChevronUp, Bell, Volume2, AlertCircle } from 'lucide-react';
import { soundFX, showBackgroundNotification } from '../utils/audio.js';

export default function LiveMatchToast({ match, onOpenReport, onOpenChat }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [hasWhistled, setHasWhistled] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const timer = match?.matchTimer;
  const isMatchFinished = !match || match.status === 'finished' || !timer || !timer.active || !timer.endsAt;

  useEffect(() => {
    if (isMatchFinished) {
      setTimeLeft(0);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((timer.endsAt - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && !hasWhistled) {
        setIsExpired(true);
        setHasWhistled(true);
        soundFX.playRefereeWhistle();
        showBackgroundNotification('🏁 ¡PITAZO FINAL EN CANCHA!', {
          body: 'El tiempo de juego ha concluido. Toquen para reportar el resultado final acordado.'
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timer?.endsAt, isMatchFinished, hasWhistled]);

  // Si el partido ya finalizó o el temporizador no está activo, no mostrar el toast
  if (isMatchFinished) {
    return null;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const totalDurationSec = (timer.durationMinutes || 60) * 60;
  const progressPercent = Math.min(100, Math.max(0, ((totalDurationSec - timeLeft) / totalDurationSec) * 100));

  return (
    <div style={{
      position: 'fixed',
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: '92%',
      maxWidth: '380px'
    }}>
      <div style={{
        background: isExpired 
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))'
          : 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
        backdropFilter: 'blur(16px)',
        borderRadius: '24px',
        border: isExpired ? '1px solid #ef4444' : '1px solid rgba(16, 185, 129, 0.4)',
        boxShadow: isExpired 
          ? '0 12px 30px rgba(239, 68, 68, 0.4), 0 0 15px rgba(239, 68, 68, 0.3)'
          : '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(16, 185, 129, 0.2)',
        color: '#fff',
        padding: '10px 14px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Barra superior estilo Isla Dinámica */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          cursor: 'pointer'
        }} onClick={() => setExpanded(!expanded)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isExpired ? '#fee2e2' : '#10b981',
              boxShadow: isExpired ? '0 0 8px #fee2e2' : '0 0 8px #10b981',
              animation: 'pulse 1.5s infinite'
            }} />
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px' }}>
              {isExpired ? '🏁 PITAZO FINAL' : '⏱️ PARTIDO EN CANCHA'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '15px',
              fontWeight: 900,
              fontFamily: 'monospace',
              letterSpacing: '1px',
              color: isExpired ? '#fff' : '#10b981'
            }}>
              {isExpired ? '00:00' : timeFormatted}
            </span>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Barra de progreso de alquiler de cancha */}
        <div style={{
          height: '3px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '3px',
          marginTop: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: isExpired ? '#fff' : '#10b981',
            transition: 'width 1s linear'
          }} />
        </div>

        {/* Vista expandida con acciones rápidas */}
        {expanded && (
          <div style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <p style={{ fontSize: '11px', color: isExpired ? '#fee2e2' : '#cbd5e1' }}>
              {isExpired 
                ? '¡El tiempo de alquiler ha concluido! Marca quién ganó el encuentro para sumar los +35 puntos en el ranking.'
                : `Alarma de silbato configurada para ${timer.durationMinutes} min. No necesitas usar otra app.`}
            </p>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReport?.();
                }}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  fontSize: '12px',
                  background: isExpired ? '#fff' : undefined,
                  color: isExpired ? '#991b1b' : undefined,
                  fontWeight: 800
                }}
              >
                <Trophy size={14} />
                Marcar Marcador
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  soundFX.playRefereeWhistle();
                }}
                className="btn btn-secondary"
                title="Probar sonido de silbato de árbitro"
                style={{ padding: '8px 10px', fontSize: '12px' }}
              >
                <Volume2 size={14} />
                Pitazo
              </button>

              {onOpenChat && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChat();
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '8px 10px', fontSize: '12px' }}
                >
                  Chat
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
