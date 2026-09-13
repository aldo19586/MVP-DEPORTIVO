import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Users, 
  MapPin, 
  Zap, 
  Clock, 
  Check, 
  ShieldCheck, 
  X, 
  ChevronRight, 
  Flame, 
  Search,
  Filter
} from 'lucide-react';
import { soundFX } from '../utils/audio.js';
import { socket } from '../services/socket.js';

export default function ReplacementMarketModal({
  user,
  sports = [],
  location,
  onJoinLobby,
  onClose
}) {
  const [selectedSport, setSelectedSport] = useState('all');
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningCode, setJoiningCode] = useState(null);

  const fetchLobbies = () => {
    setLoading(true);
    socket.emit('getReplacementLobbies', {
      sportId: selectedSport,
      district: location?.district
    });
  };

  useEffect(() => {
    fetchLobbies();

    const handleList = (data) => {
      setLobbies(data.lobbies || []);
      setLoading(false);
    };

    const handleMarketUpdated = (data) => {
      setLobbies(data.lobbies || []);
      setLoading(false);
    };

    socket.on('replacementLobbiesList', handleList);
    socket.on('replacementMarketUpdated', handleMarketUpdated);

    return () => {
      socket.off('replacementLobbiesList', handleList);
      socket.off('replacementMarketUpdated', handleMarketUpdated);
    };
  }, [selectedSport]);

  const handleJoin = (lobby) => {
    if (!user) {
      alert('Debes iniciar sesión para postularte como suplente');
      return;
    }

    setJoiningCode(lobby.code);
    soundFX.playMatchFound?.();

    if (onJoinLobby) {
      onJoinLobby(lobby.code);
    } else {
      socket.emit('joinReplacementSlot', {
        code: lobby.code,
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          district: user.district || location?.district,
          position: user.position || 'MED'
        }
      });
    }

    setTimeout(() => {
      setJoiningCode(null);
      onClose();
    }, 500);
  };

  const filteredLobbies = lobbies.filter(l => {
    if (selectedSport === 'all') return true;
    return l.sportId === selectedSport;
  });

  return (
    <div className="modal-overlay" style={{ zIndex: 10000, padding: '16px' }}>
      <div 
        className="modal-content"
        style={{
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #0f172a 0%, #090e17 100%)',
          border: '1.5px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.15)'
        }}
      >
        {/* Header con Pulso de Emergencia */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.12) 100%)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
              flexShrink: 0
            }}>
              <Flame size={22} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#fff' }}>
                  Bolsa de Suplentes
                </h3>
                <span style={{
                  fontSize: '9px',
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid #ef4444',
                  color: '#f87171',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontWeight: 800,
                  letterSpacing: '0.5px'
                }}>
                  ¡FALTA 1!
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                Partidos incompletos o con bajas de última hora cerca de ti
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
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

        {/* Filtros rápidos de Deporte */}
        <div style={{
          padding: '12px 18px 6px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <button
            onClick={() => setSelectedSport('all')}
            style={{
              background: selectedSport === 'all' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              border: selectedSport === 'all' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
              color: selectedSport === 'all' ? '#fbbf24' : '#94a3b8',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            🔥 Todos los Deportes ({lobbies.length})
          </button>

          {sports.map(s => {
            const isSel = selectedSport === s.id;
            const count = lobbies.filter(l => l.sportId === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSport(s.id)}
                style={{
                  background: isSel ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  border: isSel ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: isSel ? '#fbbf24' : '#94a3b8',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{s.icon}</span>
                <span>{s.name}</span>
                {count > 0 && (
                  <span style={{
                    background: '#f59e0b',
                    color: '#000',
                    fontSize: '9px',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    fontWeight: 900
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lista de Partidos que buscan suplentes */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '13px' }}>Escaneando salas con cupos disponibles en tu zona...</p>
            </div>
          ) : filteredLobbies.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '45px 20px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '18px',
              border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🛡️</div>
              <h4 style={{ margin: '0 0 6px', color: '#fff', fontSize: '15px', fontWeight: 800 }}>
                No hay partidos buscando suplentes
              </h4>
              <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: '12px', lineHeight: 1.4 }}>
                Todas las salas de tu zona están completas o jugando en este momento.
              </p>
              <button
                onClick={fetchLobbies}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '8px 16px', margin: '0 auto' }}
              >
                Actualizar Radar
              </button>
            </div>
          ) : (
            filteredLobbies.map((lobby) => {
              const total = lobby.currentPlayersCount;
              const max = lobby.totalSlots;
              const missing = lobby.neededSlots;
              const isUrgent = lobby.hadCancellation;

              return (
                <div
                  key={lobby.code}
                  style={{
                    background: isUrgent 
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isUrgent ? '1.5px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '18px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: isUrgent ? '0 8px 24px rgba(239, 68, 68, 0.15)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Fila superior: Deporte, Estado y Cupos */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>
                        {lobby.sportId === 'futbol' ? '⚽' : lobby.sportId === 'padel' ? '🎾' : lobby.sportId === 'basquet' ? '🏀' : '🏆'}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#fff', letterSpacing: '0.2px' }}>
                          {lobby.sportId?.toUpperCase()} {lobby.formatId} ({lobby.formatName})
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                          <MapPin size={12} color="#f59e0b" />
                          <span>{lobby.district}</span>
                        </div>
                      </div>
                    </div>

                    {/* Badge de Cupo */}
                    <div style={{
                      background: isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      border: `1px solid ${isUrgent ? '#ef4444' : '#10b981'}`,
                      borderRadius: '10px',
                      padding: '4px 8px',
                      textAlign: 'right'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 900, color: isUrgent ? '#f87171' : '#34d399' }}>
                        {isUrgent ? `¡FALTA ${missing}! (Baja)` : `Falta ${missing}`}
                      </div>
                      <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                        {total} de {max} listos
                      </div>
                    </div>
                  </div>

                  {/* Barra de progreso de jugadores */}
                  <div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(100, (total / max) * 100)}%`,
                        height: '100%',
                        background: isUrgent 
                          ? 'linear-gradient(90deg, #f59e0b, #ef4444)' 
                          : 'linear-gradient(90deg, #10b981, #059669)',
                        borderRadius: '6px'
                      }} />
                    </div>
                  </div>

                  {/* Detalle de Jugadores Actuales (Avatares) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ display: 'flex', marginLeft: '6px' }}>
                        {[...(lobby.teamA || []), ...(lobby.teamB || [])].slice(0, 5).map((p, idx) => (
                          <img
                            key={p.id || idx}
                            src={p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt={p.name}
                            title={`${p.name} (${p.position || 'MED'})`}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              border: '2px solid #0f172a',
                              marginLeft: idx === 0 ? 0 : '-8px',
                              objectFit: 'cover'
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
                        Capitán: <strong style={{ color: '#cbd5e1' }}>{lobby.hostName}</strong>
                      </span>
                    </div>

                    {/* Botón de Postularse / Entrar de Suplente */}
                    <button
                      onClick={() => handleJoin(lobby)}
                      disabled={joiningCode === lobby.code}
                      style={{
                        background: isUrgent 
                          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                          : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '10px',
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: isUrgent 
                          ? '0 4px 15px rgba(239, 68, 68, 0.4)' 
                          : '0 4px 15px rgba(245, 158, 11, 0.4)'
                      }}
                    >
                      <Zap size={14} fill="#fff" />
                      <span>{joiningCode === lobby.code ? 'Entrando...' : '¡Me Apunto!'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Informativo */}
        <div style={{
          padding: '12px 18px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#94a3b8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>Al unirte sumas puntos Glicko-2 y reputación comunitaria</span>
          </div>
          <button
            onClick={fetchLobbies}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Refrescar
          </button>
        </div>
      </div>
    </div>
  );
}
