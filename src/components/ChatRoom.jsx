import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Trophy, MapPin, Clock, MessageSquare, CheckCheck, AlertCircle, Play, ShieldAlert, UserCheck } from 'lucide-react';
import { soundFX } from '../utils/audio.js';
import { socket } from '../services/socket.js';

const QUICK_CHIPS = [
  '📍 ¿Cancha por Surco o San Borja?',
  '⏰ ¿Hoy a las 8:00 PM o 9:00 PM?',
  '⚽ ¿Llevan balón oficial?',
  '🤝 ¿El que pierde paga la cancha?'
];

export default function ChatRoom({
  match,
  currentUserId,
  currentUserName,
  onSendMessage,
  onOpenReportModal,
  onStartTimer,
  onLeaveRoom
}) {
  const [inputText, setInputText] = useState('');
  const [showDurationModal, setShowDurationModal] = useState(false);
  const messagesEndRef = useRef(null);

  const inTeamA = match?.teamA.some((p) => p.id === currentUserId || p.userId === currentUserId);
  const myTeam = inTeamA ? match?.teamA : match?.teamB;
  const rivalTeam = inTeamA ? match?.teamB : match?.teamA;
  const rivalNames = rivalTeam?.map((p) => p.name).join(', ') || 'Rival';

  const is1v1 = match?.is1v1 || match?.formatId === '1v1' || (match?.teamA?.length === 1 && match?.teamB?.length === 1);
  const isDesignatedReporter = is1v1 && match?.designatedReporter === currentUserId;
  const timerActive = match?.matchTimer?.active;

  // Unirse a la sala de Socket.IO inmediatamente al cargar el chat
  useEffect(() => {
    if (match?.id) {
      socket.emit('joinMatchRoom', { matchId: match.id });
    }
  }, [match?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [match?.chatMessages]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
    soundFX.playMessage();
  };

  const handleQuickChip = (text) => {
    onSendMessage(text);
    soundFX.playMessage();
  };

  const handleSelectDuration = (mins) => {
    setShowDurationModal(false);
    onStartTimer(mins);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 75px)',
      background: '#0a0f1d'
    }}>
      {/* Header del Chat */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onLeaveRoom}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                VS {rivalNames}
              </span>
              <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                {match?.sportId} • {match?.formatId}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b' }}>
              Sala privada de coordinación
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {match?.status === 'finished' ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 800
            }}>
              <span>🏁 Finalizado</span>
            </div>
          ) : !timerActive ? (
            <button
              onClick={() => setShowDurationModal(true)}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '6px 10px', gap: '4px', background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}
            >
              <Play size={12} />
              Iniciar en Cancha
            </button>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 800
            }}>
              <Clock size={12} />
              <span>En Juego</span>
            </div>
          )}

          <button
            onClick={onOpenReportModal}
            className="btn btn-primary"
            style={{ fontSize: '11px', padding: '6px 10px', gap: '4px' }}
          >
            <Trophy size={13} />
            {match?.status === 'finished' ? 'Ver Resultado' : isDesignatedReporter ? 'Marcar Marcador' : 'Resultado'}
          </button>
        </div>
      </div>

      {/* Banner de Reportero Designado Oficial en 1v1 */}
      {is1v1 && (
        <div style={{
          background: isDesignatedReporter ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          borderBottom: isDesignatedReporter ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(59, 130, 246, 0.25)',
          padding: '6px 14px',
          fontSize: '11px',
          color: isDesignatedReporter ? '#6ee7b7' : '#93c5fd',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <UserCheck size={14} style={{ flexShrink: 0 }} />
          <span>
            {match?.status === 'finished'
              ? '🏁 Encuentro concluido. Resultado oficial registrado en el ranking (+35 pts al ganador).'
              : isDesignatedReporter
              ? '⭐ ¡Eres el Reportero Oficial! Al finalizar el partido en cancha, marca el resultado acordado (+35 pts al ganador).'
              : `👤 Reportero Oficial: ${match?.designatedReporterName || 'El rival'}. Marcará el resultado acordado en cancha.`}
          </span>
        </div>
      )}

      {/* Banner de seguridad / Legalidad */}
      <div style={{
        background: 'rgba(245, 158, 11, 0.08)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
        padding: '5px 16px',
        fontSize: '10px',
        color: '#fcd34d',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <AlertCircle size={12} style={{ flexShrink: 0 }} />
        <span>Acuerdos de cancha, alquiler y balón son directos entre jugadores en este chat.</span>
      </div>

      {/* Mensajes del Chat */}
      <div className="chat-scroll" style={{ flex: 1 }}>
        {match?.chatMessages?.map((msg) => {
          const isMine = msg.senderId === currentUserId;
          const isSystem = msg.senderId === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="chat-bubble system">
                {msg.text}
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`chat-bubble ${isMine ? 'mine' : 'other'}`}
            >
              {!isMine && (
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', marginBottom: '2px' }}>
                  {msg.senderName}
                </div>
              )}
              <div>{msg.text}</div>
              <div style={{
                fontSize: '9px',
                color: isMine ? 'rgba(4, 36, 22, 0.7)' : '#64748b',
                textAlign: 'right',
                marginTop: '4px'
              }}>
                {msg.timestamp}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Chips Rápidos de Coordinación */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        padding: '8px 12px',
        background: 'rgba(15, 23, 42, 0.9)'
      }}>
        {QUICK_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickChip(chip)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '5px 10px',
              color: '#cbd5e1',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Barra de Entrada de Texto */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '10px 12px',
          background: 'rgba(15, 23, 42, 0.98)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe para coordinar hora y cancha..."
          style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '10px 16px',
            color: '#fff',
            fontSize: '13px',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Send size={16} />
        </button>
      </form>

      {/* Modal de Selector de Duración de Cancha */}
      {showDurationModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '340px', padding: '20px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '2px solid #3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <Clock size={24} color="#3b82f6" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              Iniciar Partido en Cancha
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', marginBottom: '18px' }}>
              ¿Cuánto tiempo van a jugar? La app hará sonar la alarma de pitazo de árbitro cuando termine su turno de alquiler:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {[
                { mins: 30, label: '⏱️ 30 Minutos' },
                { mins: 45, label: '⏱️ 45 Minutos' },
                { mins: 60, label: '⏱️ 60 Min (1h)' },
                { mins: 90, label: '⏱️ 90 Min (1.5h)' }
              ].map(({ mins, label }) => (
                <button
                  key={mins}
                  onClick={() => handleSelectDuration(mins)}
                  className="btn btn-secondary"
                  style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 700 }}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowDurationModal(false)}
              style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
