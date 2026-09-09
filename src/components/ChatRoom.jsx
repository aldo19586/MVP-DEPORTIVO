import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  ArrowLeft,
  Trophy,
  MapPin,
  Clock,
  MessageSquare,
  CheckCheck,
  AlertCircle,
  Play,
  ShieldAlert,
  UserCheck,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
  LogOut
} from 'lucide-react';
import { soundFX } from '../utils/audio.js';
import { socket } from '../services/socket.js';

const QUICK_CHIPS = [
  '📍 ¿Cancha por Surco o San Borja?',
  '⏰ ¿Hoy a las 8:00 PM o 9:00 PM?',
  '⚽ ¿Llevan balón oficial?',
  '🎽 ¿De qué color van sus camisetas?',
  '🤝 ¿El que pierde paga la cancha?'
];

export default function ChatRoom({
  match,
  currentUserId,
  currentUserName,
  onSendMessage,
  onOpenReportModal,
  onStartTimer,
  onMinimize,
  onLeaveMatch,
  onConvertToLobby
}) {
  const [inputText, setInputText] = useState('');
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showConfirmLeaveModal, setShowConfirmLeaveModal] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const messagesEndRef = useRef(null);

  const inTeamA = match?.teamA?.some((p) => p.id === currentUserId || p.userId === currentUserId);
  const myTeam = inTeamA ? match?.teamA : match?.teamB;
  const rivalTeam = inTeamA ? match?.teamB : match?.teamA;
  const rivalCaptain = rivalTeam?.[0]?.name || 'Rival';

  const is1v1 = match?.is1v1 || match?.formatId === '1v1' || (match?.teamA?.length === 1 && match?.teamB?.length === 1);
  const isDesignatedReporter = is1v1 && match?.designatedReporter === currentUserId;
  const timerActive = match?.matchTimer?.active;

  const expectedPerTeam = match?.formatId === '5v5' ? 5 : match?.formatId === '7v7' ? 7 : match?.formatId === '3v3' ? 3 : match?.formatId === '2v2' ? 2 : 1;
  const isMatchIncomplete = !is1v1 && ((myTeam?.length || 0) < expectedPerTeam || (rivalTeam?.length || 0) < expectedPerTeam);

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
      background: 'linear-gradient(180deg, #090e17 0%, #05080f 100%)',
      position: 'relative'
    }}>
      {/* Header Minimalista & Profesional del Chat */}
      <div style={{
        padding: '10px 14px',
        background: 'rgba(15, 23, 42, 0.96)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        zIndex: 10
      }}>
        {/* Botón Atrás / Explorar */}
        <button
          onClick={onMinimize || (() => {})}
          title="Minimizar y explorar la app"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#cbd5e1',
            borderRadius: '12px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <ArrowLeft size={18} />
        </button>

        {/* Título Central Interactivo (Toca para ver Plantillas) */}
        <div
          onClick={() => setShowRosterModal(true)}
          style={{
            flex: 1,
            textAlign: 'center',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#fff', letterSpacing: '0.2px' }}>
              {is1v1 ? `VS ${rivalCaptain}` : `⚽ ${match?.sportId?.toUpperCase()} ${match?.formatId?.toUpperCase()}`}
            </span>
            <span style={{
              fontSize: '9px',
              background: isMatchIncomplete ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: isMatchIncomplete ? '#f87171' : '#34d399',
              padding: '1px 5px',
              borderRadius: '4px',
              fontWeight: 800
            }}>
              {is1v1 ? '1v1' : `${myTeam?.length || 1}v${rivalTeam?.length || 1}`}
            </span>
          </div>
          <p style={{ fontSize: '10px', color: '#94a3b8', margin: '1px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isMatchIncomplete ? '#ef4444' : '#10b981' }} />
            <span>{isMatchIncomplete ? '⚠️ Plantilla incompleta' : 'Ver alineaciones'}</span>
            <ChevronDown size={12} color="#94a3b8" />
          </p>
        </div>

        {/* Botones de Acción: Iniciar / Reportar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {match?.status === 'finished' ? (
            <button
              onClick={onOpenReportModal}
              className="btn btn-primary"
              style={{ fontSize: '11px', padding: '6px 10px', fontWeight: 800, gap: '4px' }}
            >
              <Trophy size={13} />
              <span>Resultado</span>
            </button>
          ) : !timerActive ? (
            <button
              onClick={() => {
                if (isMatchIncomplete) {
                  alert(`⚠️ No se puede iniciar en cancha: Tu equipo tiene ${myTeam?.length || 0}/${expectedPerTeam} jugadores y el rival ${rivalTeam?.length || 0}/${expectedPerTeam}. Completa la plantilla invitando a un amigo.`);
                  return;
                }
                setShowDurationModal(true);
              }}
              style={{
                background: isMatchIncomplete ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: isMatchIncomplete ? '#64748b' : '#fff',
                border: isMatchIncomplete ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                borderRadius: '10px',
                padding: '7px 10px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: isMatchIncomplete ? 'not-allowed' : 'pointer',
                boxShadow: isMatchIncomplete ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.3)',
                opacity: isMatchIncomplete ? 0.6 : 1
              }}
              title={isMatchIncomplete ? 'Se requiere plantilla completa para iniciar' : 'Iniciar partido en cancha'}
            >
              <Play size={12} fill={isMatchIncomplete ? '#64748b' : '#fff'} />
              <span>En Cancha</span>
            </button>
          ) : (
            <button
              onClick={onOpenReportModal}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '7px 10px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
              }}
            >
              <Trophy size={13} />
              <span>Reportar</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de Aviso cuando la Plantilla está Incompleta + Botón Invitar Amigo */}
      {isMatchIncomplete && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#fca5a5' }}>
            <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>Faltan jugadores ({myTeam?.length || 0}/{expectedPerTeam}). Completa la escuadra para iniciar.</span>
          </div>
          {onConvertToLobby && (
            <button
              onClick={onConvertToLobby}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
              }}
            >
              📲 Invitar Amigo
            </button>
          )}
        </div>
      )}

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
              ? '🏁 Encuentro concluido. Resultado oficial registrado (+35 pts).'
              : isDesignatedReporter
              ? '⭐ Eres el Reportero Oficial. Al terminar marca el ganador.'
              : `👤 Reportero Oficial: ${match?.designatedReporterName || 'El rival'}.`}
          </span>
        </div>
      )}

      {/* Banner de seguridad / Consejos */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '5px 14px',
        fontSize: '10px',
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <AlertCircle size={12} color="#f59e0b" />
          <span>Coordinen hora y cancha en este chat privado.</span>
        </div>
        <button
          onClick={() => setShowConfirmLeaveModal(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#f87171',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px'
          }}
        >
          ✕ Cancelar Partido
        </button>
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
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          padding: '8px 12px',
          background: 'rgba(15, 23, 42, 0.9)',
          scrollbarWidth: 'none'
        }}
      >
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
                { mins: 30, label: '30 Minutos' },
                { mins: 45, label: '45 Minutos' },
                { mins: 60, label: '60 Min (1 hora)' },
                { mins: 90, label: '90 Min (1.5 horas)' }
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

      {/* Modal de Confirmación para Cancelar Partido y Abandonar */}
      {showConfirmLeaveModal && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ maxWidth: '360px', padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <X size={22} color="#ef4444" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              ¿Cancelar y Salir del Partido?
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', marginBottom: '18px', lineHeight: '1.4' }}>
              Si sales definitivamente, se cancelará la sala de coordinación para todos los jugadores y volverás al menú principal.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  setShowConfirmLeaveModal(false);
                  if (onLeaveMatch) onLeaveMatch();
                }}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Sí, Cancelar Partido
              </button>

              <button
                onClick={() => setShowConfirmLeaveModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Continuar en el Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet: Alineaciones y Plantillas de Ambos Equipos */}
      {showRosterModal && (
        <div className="modal-overlay" onClick={() => setShowRosterModal(false)} style={{ zIndex: 99999 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '440px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              borderRadius: '24px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#fff', margin: 0 }}>
                  Alineaciones del Encuentro
                </h3>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>
                  {match?.sportId?.toUpperCase()} • {match?.formatId?.toUpperCase()} ({match?.teamA?.length || 1} vs {match?.teamB?.length || 1})
                </p>
              </div>

              <button
                onClick={() => setShowRosterModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {/* Mi Equipo */}
              <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '14px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#34d399', textTransform: 'uppercase' }}>
                    Mi Equipo ({myTeam?.length || 0})
                  </span>
                  <span style={{ fontSize: '10px', color: '#6ee7b7' }}>
                    Promedio: {Math.round(myTeam?.reduce((acc, p) => acc + (p.rating || 1500), 0) / (myTeam?.length || 1))} OVR
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {myTeam?.map((p, idx) => (
                    <div
                      key={p.userId || p.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={p.name}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                            {p.name} {(p.userId || p.id) === currentUserId && '(Tú)'}
                          </span>
                          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>
                            {p.district || 'Lima'} • Pos: {p.position || 'MED'}
                          </span>
                        </div>
                      </div>

                      <span style={{ fontSize: '11px', fontWeight: 900, color: '#fcd34d' }}>
                        {p.rating || 1500} OVR
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* VS Divider */}
              <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 900, color: '#f59e0b' }}>
                ⚔️ VERSUS ⚔️
              </div>

              {/* Equipo Rival */}
              <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '14px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#f87171', textTransform: 'uppercase' }}>
                    Equipo Rival ({rivalTeam?.length || 0})
                  </span>
                  <span style={{ fontSize: '10px', color: '#fca5a5' }}>
                    Promedio: {Math.round(rivalTeam?.reduce((acc, p) => acc + (p.rating || 1500), 0) / (rivalTeam?.length || 1))} OVR
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rivalTeam?.map((p, idx) => (
                    <div
                      key={p.userId || p.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={p.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                          alt={p.name}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                            {p.name}
                          </span>
                          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>
                            {p.district || 'Lima'} • Pos: {p.position || 'DEL'}
                          </span>
                        </div>
                      </div>

                      <span style={{ fontSize: '11px', fontWeight: 900, color: '#fcd34d' }}>
                        {p.rating || 1500} OVR
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRosterModal(false)}
              className="btn btn-primary"
              style={{ marginTop: '14px', width: '100%', padding: '10px', fontSize: '12px' }}
            >
              Volver al Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
