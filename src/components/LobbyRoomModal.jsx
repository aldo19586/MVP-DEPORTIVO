import React, { useState } from 'react';
import { Users, Copy, Share2, Check, ArrowLeft, Play, Bot, ShieldCheck, Zap, UserCheck, Clock, Globe, MapPin, Target, ChevronDown, X } from 'lucide-react';
import { soundFX, showBackgroundNotification } from '../utils/audio.js';

export default function LobbyRoomModal({
  lobby,
  sports = [],
  currentUserId,
  location,
  onOpenMapModal,
  onChangeFormat,
  onToggleReady,
  onSwitchTeam,
  onFillDemos,
  onStartMatch,
  onStartRadarSearch,
  onStartMatchWithBots,
  onMinimize,
  onLeaveLobby
}) {
  const [copied, setCopied] = useState(false);
  const [playWithBots, setPlayWithBots] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showConfirmLeaveModal, setShowConfirmLeaveModal] = useState(false);

  if (!lobby) return null;

  const currentSport = sports.find((s) => s.id === lobby.sportId) || { formats: [] };
  const fallbackFormats = [
    { id: '1v1', name: '1v1 (Rey de la Pista)', playersPerTeam: 1 },
    { id: '2v2', name: '2v2 (Duelo Parejas)', playersPerTeam: 2 },
    { id: '3v3', name: '3v3 (Squad)', playersPerTeam: 3 },
    { id: '5v5', name: '5v5 (Futsal / Cancha Chica)', playersPerTeam: 5 },
    { id: '7v7', name: '7v7 (Fútbol 7 Tradicional)', playersPerTeam: 7 }
  ];
  const formatsList = (currentSport.formats && currentSport.formats.length > 0)
    ? currentSport.formats
    : fallbackFormats;

  const isHost = lobby.hostUserId === currentUserId;
  const inTeamA = lobby.teamA.some((p) => (p.userId || p.id) === currentUserId);
  const myPlayer = [...lobby.teamA, ...lobby.teamB].find((p) => (p.userId || p.id) === currentUserId);
  const isMyReady = Boolean(myPlayer?.isReady);

  const totalPlayers = lobby.teamA.length + lobby.teamB.length;
  const neededPlayers = lobby.totalSlots;
  const isFull = totalPlayers === neededPlayers;

  const allReady = isFull && [...lobby.teamA, ...lobby.teamB].every((p) => p.isReady);
  const readyCount = [...lobby.teamA, ...lobby.teamB].filter((p) => p.isReady).length;

  // Generar enlace compartible con IP LAN (para celulares en la misma red)
  const lanHost = window.location.hostname === 'localhost' ? (window.location.hostname) : window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  const shareUrl = `${window.location.protocol}//${window.location.host}/?lobby=${lobby.code}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      soundFX.playMessage();
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `⚽ ¡Únete a mi partido en MATCHSPORT!\nModo: ${lobby.sportId.toUpperCase()} ${lobby.formatId} (${lobby.formatName})\nEntra con este enlace para jugar y sumar puntos al ranking:\n${shareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Crear slots vacíos para visualizar la capacidad
  const renderTeamSlots = (teamPlayers, teamKey, teamTitle, teamColor) => {
    const slots = [];
    const max = lobby.playersPerTeam;

    for (let i = 0; i < max; i++) {
      const player = teamPlayers[i];
      if (player) {
        const isMe = (player.userId || player.id) === currentUserId;
        slots.push(
          <div
            key={player.id || i}
            style={{
              background: player.isReady ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: player.isReady ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={player.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={player.name}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `2px solid ${player.isReady ? '#10b981' : 'rgba(255, 255, 255, 0.2)'}`
                  }}
                />
                {player.isHost && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      fontSize: '11px',
                      background: '#f59e0b',
                      borderRadius: '50%',
                      padding: '1px 3px'
                    }}
                    title="Anfitrión / Capitán de la sala"
                  >
                    👑
                  </span>
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                    {player.name}
                  </span>
                  {isMe && (
                    <span style={{ fontSize: '9px', background: '#3b82f6', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                      TÚ
                    </span>
                  )}
                  {player.isDemo && (
                    <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', padding: '1px 4px', borderRadius: '4px' }}>
                      BOT
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  Posición: <strong style={{ color: '#fbbf24' }}>{player.position || 'MED'}</strong> • {player.rating || 1400} pts
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                background: player.isReady ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                border: `1px solid ${player.isReady ? '#10b981' : 'rgba(245, 158, 11, 0.3)'}`,
                color: player.isReady ? '#34d399' : '#fbbf24',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {player.isReady ? <Check size={13} /> : <Clock size={13} />}
                <span>{player.isReady ? 'LISTO' : 'Esperando...'}</span>
              </div>
            </div>
          </div>
        );
      } else {
        // Slot Vacío
        const canSwitchHere = (teamKey === 'teamA' && !inTeamA) || (teamKey === 'teamB' && inTeamA);
        slots.push(
          <div
            key={`empty_${i}`}
            style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#64748b',
              fontSize: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px dashed rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b'
              }}>
                +
              </div>
              <span>Cupo disponible #{i + 1}</span>
            </div>

            {canSwitchHere && (
              <button
                onClick={() => onSwitchTeam(teamKey)}
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#60a5fa',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Moverme aquí
              </button>
            )}
          </div>
        );
      }
    }

    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: `1px solid ${teamColor}`,
        borderRadius: '16px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: teamColor,
              display: 'inline-block'
            }} />
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
              {teamTitle}
            </h4>
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>
            {teamPlayers.length} / {lobby.playersPerTeam} jugadores
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {slots}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      maxWidth: '520px',
      margin: '0 auto',
      padding: '14px 16px 40px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Barra de Navegación Superior */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onMinimize || (() => {})}
            title="Minimizar sala y navegar por la app"
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#60a5fa',
              borderRadius: '10px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>📱</span>
            <span>Explorar App</span>
          </button>

          <button
            onClick={() => setShowConfirmLeaveModal(true)}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              borderRadius: '10px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <X size={14} />
            <span>Abandonar</span>
          </button>
        </div>

        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '10px',
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 800 }}>
            SALA #{lobby.code}
          </span>
        </div>
      </div>

      {/* Tarjeta de Información de la Sala */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '16px',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.06)', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
          <span>{lobby.sportId?.toUpperCase()}</span>
          <span>•</span>
          <span style={{ color: '#10b981', fontWeight: 800 }}>{lobby.formatId} ({lobby.formatName})</span>
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>
          Sala de Convocatoria de Equipos
        </h3>
        <p style={{ fontSize: '12px', color: '#94a3b8' }}>
          Invita a tus amigos con el enlace o código. Todos los que jueguen sumarán puntos al ranking oficial de {lobby.formatId}.
        </p>

        {/* Cápsula interactiva de Modalidad (encapsulada en un botón) */}
        <div style={{
          marginTop: '12px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>{currentSport?.icon || '⚽'}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Modalidad de Juego
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ color: '#10b981' }}>{lobby.formatName || lobby.formatId}</span>
                <span style={{
                  fontSize: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 800
                }}>
                  {lobby.playersPerTeam} vs {lobby.playersPerTeam}
                </span>
              </div>
            </div>
          </div>

          {isHost ? (
            <button
              type="button"
              onClick={() => setShowFormatModal(true)}
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))',
                border: '1px solid #10b981',
                color: '#34d399',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.15)'
              }}
            >
              <span>👑 Cambiar</span>
              <ChevronDown size={14} />
            </button>
          ) : (
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              Elegida por Capitán
            </span>
          )}
        </div>

        {/* Bloque de Compartir Enlace */}
        <div style={{
          marginTop: '14px',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCopyLink}
              className="btn btn-secondary"
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '12px',
                fontWeight: 800,
                background: copied ? 'rgba(16, 185, 129, 0.2)' : undefined,
                borderColor: copied ? '#10b981' : undefined,
                color: copied ? '#34d399' : '#fff'
              }}
            >
              {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
              {copied ? '¡Enlace Copiado!' : 'Copiar Enlace'}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="btn btn-secondary"
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '12px',
                fontWeight: 800,
                background: 'rgba(37, 211, 102, 0.15)',
                borderColor: 'rgba(37, 211, 102, 0.4)',
                color: '#25d366'
              }}
            >
              <Share2 size={15} />
              Enviar a WhatsApp
            </button>
          </div>

          <div style={{ fontSize: '10px', color: '#64748b', wordBreak: 'break-all' }}>
            🔗 Enlace directo: <span style={{ color: '#38bdf8' }}>{shareUrl}</span>
          </div>
        </div>
      </div>

      {/* Tarjeta de Zona y Radio de Búsqueda Geoespacial */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '16px',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399',
            flexShrink: 0
          }}>
            <MapPin size={20} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📍 Zona y Perímetro de Búsqueda
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span>{location?.district || 'Surco, Lima'}</span>
              <span style={{ color: '#64748b' }}>•</span>
              <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                {location?.radiusKm || 6} km a la redonda
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenMapModal}
          style={{
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: '#38bdf8',
            borderRadius: '10px',
            padding: '7px 12px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease'
          }}
          title="Abrir mapa para cambiar distrito o radio en km"
        >
          <Target size={13} />
          <span>Ajustar Radio</span>
        </button>
      </div>

      {/* Sección de Equipos (Local vs Visitante) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {renderTeamSlots(lobby.teamA, 'teamA', 'Equipo 1 (Azul)', '#3b82f6')}
        {renderTeamSlots(lobby.teamB, 'teamB', 'Equipo 2 (Rojo)', '#ef4444')}
      </div>

      {/* Barra Inferior de Acción y Estado LISTO */}
      <div style={{
        position: 'sticky',
        bottom: '12px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '18px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: allReady ? '#10b981' : '#f59e0b',
              boxShadow: allReady ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
              animation: allReady ? 'none' : 'pulse 1.5s infinite'
            }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
              {allReady
                ? 'Todos los jugadores listos'
                : `Esperando: ${readyCount} / ${neededPlayers} listos`}
            </span>
          </div>

          <button
            onClick={onToggleReady}
            style={{
              background: isMyReady
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'rgba(255, 255, 255, 0.1)',
              border: isMyReady ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              borderRadius: '10px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isMyReady ? <Check size={14} /> : <UserCheck size={14} />}
            {isMyReady ? 'Listo ✓' : 'Marcar listo'}
          </button>
        </div>

        {/* Botones de Inicio y Búsqueda para el Host */}
        {isHost ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {allReady ? (
              <button
                onClick={onStartMatch}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: 800,
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                }}
              >
                <Play size={16} />
                <span>Iniciar Partido ({lobby.formatId.toUpperCase()})</span>
              </button>
            ) : (
              <>
                {/* Checkbox solicitado: Jugar con bots */}
                <div
                  onClick={() => setPlayWithBots(!playWithBots)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: playWithBots ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: playWithBots ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={playWithBots}
                      onChange={(e) => setPlayWithBots(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#f59e0b', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: playWithBots ? '#fbbf24' : '#cbd5e1' }}>
                      Jugar con Bots Demo
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: playWithBots ? '#f59e0b' : '#94a3b8', fontWeight: 600 }}>
                    {playWithBots ? 'Partida Inmediata' : 'Búsqueda en Radar'}
                  </span>
                </div>

                {/* Indicador de Zona y Radio justo antes del botón */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  color: '#94a3b8'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={13} color="#10b981" />
                    <span>Buscando en: <strong style={{ color: '#fff' }}>{location?.district || 'Surco, Lima'}</strong> (Radio: <strong style={{ color: '#10b981' }}>{location?.radiusKm || 6} km</strong>)</span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenMapModal}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#38bdf8',
                      fontWeight: 800,
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <span>Cambiar</span>
                  </button>
                </div>

                {playWithBots ? (
                  <button
                    onClick={onStartMatchWithBots}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '13px',
                      fontWeight: 800,
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                    }}
                  >
                    <Bot size={16} />
                    <span>Iniciar con Bots Demo</span>
                  </button>
                ) : (
                  <button
                    onClick={onStartRadarSearch}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '13px',
                      fontWeight: 800,
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <Globe size={16} />
                    <span>Buscar en Radar ({lobby.formatId.toUpperCase()} • {location?.radiusKm || 6} km)</span>
                  </button>
                )}

                <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
                  {playWithBots
                    ? `Se completarán los rivales con bots para jugar de inmediato.`
                    : `Buscando rivales en ${location?.district || 'Surco, Lima'} a ${location?.radiusKm || 6} km.`}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
            {allReady
              ? `Esperando que el Capitán (${lobby.hostName}) inicie el partido de ${lobby.formatId}...`
              : `Marca "LISTO" para que el Capitán pueda comenzar la partida.`}
          </div>
        )}
      </div>
      {/* MODAL: Selector de Modalidad */}
      {showFormatModal && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981'
                }}>
                  <Users size={18} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>
                    Seleccionar Modalidad
                  </h3>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {currentSport?.name} • Sala #{lobby.code}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowFormatModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {formatsList.map((fmt) => {
                const isSelected = fmt.id === lobby.formatId;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => {
                      soundFX.playMessage();
                      onChangeFormat?.(fmt.id);
                      setShowFormatModal(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
                        color: isSelected ? '#042416' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '12px'
                      }}>
                        {fmt.playersPerTeam}v{fmt.playersPerTeam}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#34d399' : '#fff' }}>
                          {fmt.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          {fmt.playersPerTeam * 2} jugadores en total ({fmt.playersPerTeam} por equipo)
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#042416'
                      }}>
                        <Check size={15} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowFormatModal(false)}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '14px', padding: '10px', fontSize: '12px', fontWeight: 700 }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ABANDONAR LA SALA */}
      {showConfirmLeaveModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#ef4444'
            }}>
              <X size={28} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>
              ¿Abandonar la Sala #{lobby.code}?
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '22px' }}>
              Si sales de la sala, se liberará tu puesto en el equipo y tu squad quedará incompleto. ¿Confirmas tu salida?
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowConfirmLeaveModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowConfirmLeaveModal(false);
                  onLeaveLobby();
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                }}
              >
                Sí, Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
