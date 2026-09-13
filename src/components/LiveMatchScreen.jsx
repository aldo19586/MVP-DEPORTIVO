import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Clock,
  Trophy,
  MessageSquare,
  Volume2,
  ShieldAlert,
  Send,
  X,
  Play,
  Pause,
  ThumbsUp,
  UserCheck,
  ChevronDown,
  Globe,
  Lock,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { soundFX, showBackgroundNotification } from '../utils/audio.js';
import { socket } from '../services/socket.js';

export default function LiveMatchScreen({
  match,
  currentUserId,
  currentUserName,
  onOpenReportModal,
  onMinimize,
  onLeaveMatch,
  onSendMessage,
  onStartTimer,
  onSendLike
}) {
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [chatChannel, setChatChannel] = useState('all'); // 'all' (general) | 'team' (privado)
  const [chatInput, setChatInput] = useState('');
  const [likedUserIds, setLikedUserIds] = useState(new Set());
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasWhistled, setHasWhistled] = useState(false);
  const messagesEndRef = useRef(null);

  const inTeamA = match?.teamA?.some((p) => (p.userId || p.id) === currentUserId);
  const myTeam = inTeamA ? match?.teamA : match?.teamB;
  const rivalTeam = inTeamA ? match?.teamB : match?.teamA;
  const is1v1 = match?.formatId === '1v1' || (match?.teamA?.length === 1 && match?.teamB?.length === 1);
  const rivalCaptain = rivalTeam?.[0]?.name || 'Rival';

  const timer = match?.matchTimer;
  const isTimerActive = Boolean(timer?.active && timer?.endsAt);

  // Cuenta regresiva o tiempo transcurrido
  useEffect(() => {
    if (!isTimerActive || !timer?.endsAt) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((timer.endsAt - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && !hasWhistled) {
        setHasWhistled(true);
        soundFX.playRefereeWhistle();
        showBackgroundNotification('🏁 ¡TIEMPO EN CANCHA AGOTADO!', {
          body: 'El cronómetro del partido ha llegado a cero. Ya pueden reportar el resultado final.'
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [timer?.endsAt, isTimerActive, hasWhistled]);

  useEffect(() => {
    if (showChatDrawer) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [match?.chatMessages, showChatDrawer]);

  const handleSendChat = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    if (onSendMessage) {
      onSendMessage(chatInput.trim());
    } else {
      socket.emit('sendChatMessage', {
        matchId: match?.id,
        senderId: currentUserId,
        senderName: currentUserName || 'Jugador',
        text: chatInput.trim()
      });
    }
    setChatInput('');
    soundFX.playMessage();
  };

  const handleGiveLike = (targetPlayer) => {
    const targetId = targetPlayer.userId || targetPlayer.id;
    if (likedUserIds.has(targetId)) return;

    setLikedUserIds(new Set([...likedUserIds, targetId]));
    socket.emit('givePlayerLike', {
      fromUserId: currentUserId,
      fromUserName: currentUserName || 'Tu rival',
      toUserId: targetId,
      sportId: match?.sportId
    });
    soundFX.playMatchFound();
  };

  const handleRefereeWhistle = () => {
    soundFX.playRefereeWhistle();
  };

  const totalDurationSec = (timer?.durationMinutes || 60) * 60;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = isTimerActive
    ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : '00:00';
  const progressPercent = isTimerActive
    ? Math.min(100, Math.max(0, ((totalDurationSec - timeLeft) / totalDurationSec) * 100))
    : 100;

  return (
    <div style={{
      maxWidth: '540px',
      margin: '0 auto',
      padding: '14px 16px 80px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      position: 'relative'
    }}>
      {/* 1. Header de Navegación y Estado EN CANCHA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <button
          onClick={onMinimize || (() => {})}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#cbd5e1',
            borderRadius: '12px',
            padding: '7px 12px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Minimizar y volver a la app manteniendo el partido activo"
        >
          <ArrowLeft size={15} />
          <span>Explorar App</span>
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '20px',
          padding: '4px 12px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#ef4444',
            boxShadow: '0 0 8px #ef4444',
            animation: 'pulse 1.2s infinite'
          }} />
          <span style={{ fontSize: '11px', fontWeight: 900, color: '#f87171', letterSpacing: '0.5px' }}>
            PARTIDO EN VIVO
          </span>
        </div>

        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
          padding: '4px 10px',
          fontSize: '11px',
          fontWeight: 800,
          color: '#34d399'
        }}>
          {match?.sportId?.toUpperCase()} • {match?.formatId?.toUpperCase()}
        </div>
      </div>

      {/* 2. CARD CENTRAL: CRONÓMETRO ACTIVO EN VIVO */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 78, 59, 0.95) 100%)',
        border: '1.5px solid rgba(16, 185, 129, 0.4)',
        borderRadius: '24px',
        padding: '20px 18px',
        textAlign: 'center',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 25px rgba(16, 185, 129, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background glow decoration */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '120px',
          height: '120px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 0, 0, 0.3)', padding: '4px 12px', borderRadius: '12px', marginBottom: '8px' }}>
          <Clock size={13} color="#34d399" />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isTimerActive ? `Tiempo de Cancha (${timer?.durationMinutes || 60} Min)` : 'Tiempo en Cancha'}
          </span>
        </div>

        {/* Display Gigante del Cronómetro */}
        <div style={{
          fontSize: '44px',
          fontWeight: 900,
          fontFamily: 'monospace',
          color: '#fff',
          letterSpacing: '2px',
          textShadow: '0 0 20px rgba(16, 185, 129, 0.6)',
          margin: '4px 0'
        }}>
          {timeFormatted}
        </div>

        {/* Barra de Progreso del Tiempo */}
        <div style={{
          width: '80%',
          height: '6px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '99px',
          margin: '8px auto 14px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #10b981, #34d399)',
            borderRadius: '99px',
            transition: 'width 1s linear'
          }} />
        </div>

        {/* Controles del Cronómetro y Pitazo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleRefereeWhistle}
            style={{
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              color: '#fbbf24',
              borderRadius: '12px',
              padding: '7px 14px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Sonar el pitazo oficial de árbitro"
          >
            <Volume2 size={14} />
            <span>Pitazo de Árbitro</span>
          </button>

          {!isTimerActive ? (
            <button
              onClick={() => setShowDurationModal(true)}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: '#fff',
                borderRadius: '12px',
                padding: '7px 14px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Play size={13} fill="#fff" />
              <span>Fijar Tiempo de Cancha</span>
            </button>
          ) : (
            <button
              onClick={() => setShowDurationModal(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                borderRadius: '12px',
                padding: '7px 14px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Clock size={13} />
              <span>Ajustar Minutos</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. ENFRENTAMIENTO DE EQUIPOS (VERSUS ÉPICO) */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={18} color="#f59e0b" />
            <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#fff', margin: 0 }}>
              Duelo de Equipos
            </h4>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {match?.teamA?.length} vs {match?.teamB?.length} jugadores
          </span>
        </div>

        {/* Tarjetas Enfrentadas: Equipo Azul vs Equipo Rojo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* EQUIPO AZUL (Team A) */}
          <div style={{
            background: 'rgba(30, 58, 138, 0.25)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, color: '#60a5fa', textTransform: 'uppercase' }}>
                Equipo Azul {inTeamA && '⭐'}
              </span>
              <span style={{ fontSize: '10px', color: '#93c5fd', fontWeight: 800 }}>
                {Math.round(match?.teamA?.reduce((acc, p) => acc + (p.rating || 1450), 0) / (match?.teamA?.length || 1))} OVR
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {match?.teamA?.map((p, idx) => {
                const isMe = (p.userId || p.id) === currentUserId;
                const hasLiked = likedUserIds.has(p.userId || p.id);
                return (
                  <div
                    key={p.userId || p.id || idx}
                    style={{
                      background: isMe ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                      border: isMe ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '10px',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <img
                        src={p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={p.name}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #3b82f6', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name} {isMe && '(Tú)'}
                        </div>
                        <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                          {p.position || 'MED'} • <strong style={{ color: '#fbbf24' }}>{p.rating || 1450}</strong>
                        </div>
                      </div>
                    </div>

                    {!isMe && (
                      <button
                        onClick={() => handleGiveLike(p)}
                        title="Dejar Like deportivo por juego limpio"
                        style={{
                          background: hasLiked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: hasLiked ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: hasLiked ? '#34d399' : '#94a3b8',
                          borderRadius: '8px',
                          padding: '4px 6px',
                          cursor: hasLiked ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '9px'
                        }}
                      >
                        <ThumbsUp size={11} />
                        {hasLiked && <span>✓</span>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* EQUIPO ROJO (Team B) */}
          <div style={{
            background: 'rgba(127, 29, 29, 0.25)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, color: '#f87171', textTransform: 'uppercase' }}>
                Equipo Rojo {!inTeamA && '⭐'}
              </span>
              <span style={{ fontSize: '10px', color: '#fca5a5', fontWeight: 800 }}>
                {Math.round(match?.teamB?.reduce((acc, p) => acc + (p.rating || 1450), 0) / (match?.teamB?.length || 1))} OVR
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {match?.teamB?.map((p, idx) => {
                const isMe = (p.userId || p.id) === currentUserId;
                const hasLiked = likedUserIds.has(p.userId || p.id);
                return (
                  <div
                    key={p.userId || p.id || idx}
                    style={{
                      background: isMe ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                      border: isMe ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '10px',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <img
                        src={p.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                        alt={p.name}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #ef4444', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name} {isMe && '(Tú)'}
                        </div>
                        <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                          {p.position || 'DEL'} • <strong style={{ color: '#fbbf24' }}>{p.rating || 1450}</strong>
                        </div>
                      </div>
                    </div>

                    {!isMe && (
                      <button
                        onClick={() => handleGiveLike(p)}
                        title="Dejar Like deportivo por juego limpio"
                        style={{
                          background: hasLiked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: hasLiked ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: hasLiked ? '#34d399' : '#94a3b8',
                          borderRadius: '8px',
                          padding: '4px 6px',
                          cursor: hasLiked ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '9px'
                        }}
                      >
                        <ThumbsUp size={11} />
                        {hasLiked && <span>✓</span>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. BARRA DE ACCIONES INFERIOR FIJA */}
      <div style={{
        position: 'sticky',
        bottom: '12px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '18px',
        padding: '12px 14px',
        display: 'flex',
        gap: '10px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)'
      }}>
        {/* Botón Abrir Chat Drawer */}
        <button
          onClick={() => setShowChatDrawer(true)}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <MessageSquare size={16} color="#34d399" />
          <span>Chat ({match?.chatMessages?.length || 0})</span>
        </button>

        {/* Botón Reportar Resultado */}
        <button
          onClick={onOpenReportModal}
          style={{
            flex: 1.3,
            padding: '12px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none',
            color: '#fff',
            fontWeight: 900,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
          }}
        >
          <Trophy size={16} />
          <span>Reportar Resultado</span>
        </button>
      </div>

      {/* 5. MODAL / DRAWER DE CHAT FLOTANTE DEL PARTIDO */}
      {showChatDrawer && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end'
        }} onClick={() => setShowChatDrawer(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              height: '75vh',
              maxHeight: '600px',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Header del Chat Drawer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} color="#34d399" />
                <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#fff', margin: 0 }}>
                  Chat de Coordinación en Vivo
                </h3>
              </div>
              <button
                onClick={() => setShowChatDrawer(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Selector de Canal: General vs Mi Equipo */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <button
                onClick={() => setChatChannel('all')}
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: '10px',
                  background: chatChannel === 'all' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  border: chatChannel === 'all' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: chatChannel === 'all' ? '#34d399' : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Globe size={13} />
                <span>Chat General</span>
              </button>
              <button
                onClick={() => setChatChannel('team')}
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: '10px',
                  background: chatChannel === 'team' ? (inTeamA ? 'rgba(59, 130, 246, 0.25)' : 'rgba(239, 68, 68, 0.25)') : 'rgba(255, 255, 255, 0.05)',
                  border: chatChannel === 'team' ? (inTeamA ? '1px solid #3b82f6' : '1px solid #ef4444') : '1px solid rgba(255, 255, 255, 0.1)',
                  color: chatChannel === 'team' ? (inTeamA ? '#60a5fa' : '#f87171') : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Lock size={13} />
                <span>{inTeamA ? 'Mi Equipo Azul' : 'Mi Equipo Rojo'}</span>
              </button>
            </div>

            {/* Mensajes del chat */}
            <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {match?.chatMessages?.map((msg) => {
                const isMine = msg.senderId === currentUserId;
                const isSystem = msg.senderId === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '11px',
                      color: '#fbbf24',
                      textAlign: 'center'
                    }}>
                      {msg.text}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isMine ? 'flex-end' : 'flex-start',
                      maxWidth: '82%',
                      background: isMine ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255, 255, 255, 0.08)',
                      border: isMine ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      lineHeight: 1.35
                    }}
                  >
                    {!isMine && (
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#34d399', marginBottom: '2px' }}>
                        {msg.senderName}
                      </div>
                    )}
                    <div>{msg.text}</div>
                    <div style={{ fontSize: '9px', color: isMine ? 'rgba(255, 255, 255, 0.7)' : '#64748b', textAlign: 'right', marginTop: '3px' }}>
                      {msg.timestamp || ''}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input y Botón de Envío */}
            <form
              onSubmit={handleSendChat}
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={chatChannel === 'team' ? 'Mensaje solo para tu equipo...' : 'Mensaje público para todos...'}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: '#fff',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '12px',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL SELECTOR DE DURACIÓN DE CANCHA */}
      {showDurationModal && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ maxWidth: '340px', padding: '20px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              color: '#34d399'
            }}>
              <Clock size={24} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>
              Tiempo en Cancha
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', marginBottom: '18px' }}>
              ¿Cuánto tiempo dura el alquiler? La alarma de pitazo de árbitro sonará al concluir:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {[
                { mins: 30, label: '30 Minutos' },
                { mins: 45, label: '45 Minutos' },
                { mins: 60, label: '60 Min (1 hora)' },
                { mins: 90, label: '90 Min (1.5 h)' }
              ].map(({ mins, label }) => (
                <button
                  key={mins}
                  onClick={() => {
                    setShowDurationModal(false);
                    if (onStartTimer) onStartTimer(mins);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 800 }}
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
