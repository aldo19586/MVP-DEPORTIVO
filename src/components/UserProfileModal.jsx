import React, { useState } from 'react';
import {
  X,
  User,
  ShieldCheck,
  Trophy,
  MapPin,
  Target,
  Sparkles,
  HelpCircle,
  LogOut,
  ChevronRight,
  TrendingUp,
  Award,
  CheckCircle2,
  BarChart3,
  Calendar,
  Layers
} from 'lucide-react';
import PlayerCardFUT from './PlayerCardFUT.jsx';

export default function UserProfileModal({
  user,
  currentProfile,
  location,
  onOpenMapZone,
  onOpenQuestionnaire,
  onOpenLeaderboard,
  onOpenAdminDashboard,
  onLogout,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('perfil'); // 'perfil' | 'reportes'
  const [showFUTModal, setShowFUTModal] = useState(false);
  const [matchHistory, setMatchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Cargar historial de partidas del jugador (Estilo Dota 2 / MOBA)
  React.useEffect(() => {
    if (user?.id) {
      setHistoryLoading(true);
      fetch(`/api/user/${user.id}/matches`)
        .then(r => r.json())
        .then(data => {
          if (data && data.matches) {
            setMatchHistory(data.matches);
          }
        })
        .catch(err => console.warn('Error al cargar historial:', err))
        .finally(() => setHistoryLoading(false));
    }
  }, [user?.id, activeTab]);

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  // Stats acumuladas del jugador
  const matchesPlayed = matchHistory.length > 0 ? matchHistory.length : (currentProfile?.matchesPlayed || 0);
  const wins = matchHistory.length > 0 ? matchHistory.filter(m => m.won).length : (currentProfile?.wins || 0);
  const losses = matchHistory.length > 0 ? matchHistory.filter(m => !m.won && !m.draw && m.status === 'finished').length : (currentProfile?.losses || 0);
  const glickoRating = currentProfile?.rating || 1400;


  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          borderRadius: '24px',
          background: 'linear-gradient(180deg, #111827 0%, #080c14 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden'
        }}
      >
        {/* Header con Banner y Avatar */}
        <div style={{
          position: 'relative',
          padding: '24px 20px 16px',
          background: isAdmin
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.05) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(0, 0, 0, 0.4)',
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
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ position: 'relative' }}>
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={user.name}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: isAdmin ? '3px solid #ef4444' : '3px solid #10b981',
                  objectFit: 'cover',
                  boxShadow: '0 0 20px rgba(0,0,0,0.6)'
                }}
              />
              {isAdmin && (
                <div style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  borderRadius: '50%',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 900
                }}>
                  👑
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', margin: 0 }}>
                  {user.name}
                </h2>
                {isAdmin ? (
                  <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>
                    ADMIN
                  </span>
                ) : (
                  <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>
                    JUGADOR
                  </span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} color="#10b981" /> {location?.district || user.district || 'Lima'}
              </p>
            </div>
          </div>

          {/* Pestañas: Perfil vs Reportes */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button
              onClick={() => setActiveTab('perfil')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'perfil' ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
                color: activeTab === 'perfil' ? '#042416' : '#94a3b8',
                transition: 'all 0.2s'
              }}
            >
              👤 Mi Perfil & Carta
            </button>
            <button
              onClick={() => setActiveTab('reportes')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'reportes' ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
                color: activeTab === 'reportes' ? '#042416' : '#94a3b8',
                transition: 'all 0.2s'
              }}
            >
              📊 Reportes & Estadísticas
            </button>
          </div>
        </div>

        {/* Cuerpo Scrollable */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {activeTab === 'perfil' && (
            <>
              {/* Tarjeta de Carta FUT interactiva */}
              <div
                onClick={() => setShowFUTModal(true)}
                style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '28px' }}>🎴</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 900, color: '#fcd34d' }}>
                        Mi Carta FUT Oficial
                      </span>
                      <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        {glickoRating} OVR
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#cbd5e1', margin: '2px 0 0' }}>
                      Ver stats FIFA: Ritmo, Tiro, Pase y Nivel
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} color="#f59e0b" />
              </div>

              {/* Botón especial si es ADMIN */}
              {isAdmin && (
                <div
                  onClick={() => {
                    onClose();
                    onOpenAdminDashboard();
                  }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(185, 28, 28, 0.1) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: '#ef4444',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 900, color: '#fca5a5' }}>
                        👑 Panel de Control (Dueño)
                      </span>
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>
                        Métricas globales, reporte de todos los jugadores y salas
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} color="#ef4444" />
                </div>
              )}

              {/* Accesos Rápidos del Jugador */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Acciones Rápidas
                </span>

                <div
                  onClick={() => {
                    onClose();
                    onOpenLeaderboard();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Trophy size={16} color="#f59e0b" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>
                      Tabla de Rankings Globales
                    </span>
                  </div>
                  <ChevronRight size={16} color="#64748b" />
                </div>

                <div
                  onClick={() => {
                    onClose();
                    onOpenMapZone();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Target size={16} color="#10b981" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>
                      Radio y Zona de Búsqueda ({location?.radiusKm || 6} km)
                    </span>
                  </div>
                  <ChevronRight size={16} color="#64748b" />
                </div>

                <div
                  onClick={() => {
                    onClose();
                    onOpenQuestionnaire();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <HelpCircle size={16} color="#3b82f6" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>
                      Calibrar Nivel con Test Deportivo
                    </span>
                  </div>
                  <ChevronRight size={16} color="#64748b" />
                </div>
              </div>
            </>
          )}

          {activeTab === 'reportes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Tarjetas de Resumen de Partidos (KDA / Stats Generales) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '12px 8px',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff', fontFamily: 'Outfit' }}>
                    {matchesPlayed}
                  </span>
                  <p style={{ fontSize: '10px', color: '#94a3b8', margin: '2px 0 0' }}>Partidos</p>
                </div>

                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 8px',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#34d399', fontFamily: 'Outfit' }}>
                    {wins}
                  </span>
                  <p style={{ fontSize: '10px', color: '#6ee7b7', margin: '2px 0 0' }}>Victorias</p>
                </div>

                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 8px',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#f87171', fontFamily: 'Outfit' }}>
                    {losses}
                  </span>
                  <p style={{ fontSize: '10px', color: '#fca5a5', margin: '2px 0 0' }}>Derrotas</p>
                </div>
              </div>

              {/* Título de Historial Estilo MOBA / Dota 2 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⚔️ Historial de Partidas (Estilo MOBA)
                </span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  {matchHistory.length} registros
                </span>
              </div>

              {/* Lista de Partidas Estilo MOBA */}
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
                  Cargando historial de partidas...
                </div>
              ) : matchHistory.length === 0 ? (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '24px 16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>🏟️</div>
                  <p style={{ fontSize: '13px', fontWeight: 800, color: '#cbd5e1', margin: 0 }}>
                    Aún no tienes partidas oficiales registradas
                  </p>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>
                    ¡Empareja con rivales en el Radar para sumar puntos en tu carta FUT!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {matchHistory.map((m) => {
                    const isWin = m.won;
                    const isDraw = m.draw;
                    const isFinished = m.status === 'finished';

                    const badgeBg = !isFinished
                      ? 'rgba(168, 85, 247, 0.2)'
                      : isWin
                      ? 'rgba(16, 185, 129, 0.2)'
                      : isDraw
                      ? 'rgba(245, 158, 11, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)';

                    const badgeColor = !isFinished
                      ? '#c084fc'
                      : isWin
                      ? '#34d399'
                      : isDraw
                      ? '#fbbf24'
                      : '#f87171';

                    const badgeText = !isFinished
                      ? 'EN CURSO'
                      : isWin
                      ? 'VICTORIA'
                      : isDraw
                      ? 'EMPATE'
                      : 'DERROTA';

                    const borderLeftColor = !isFinished
                      ? '#a855f7'
                      : isWin
                      ? '#10b981'
                      : isDraw
                      ? '#f59e0b'
                      : '#ef4444';

                    const ptsText = isFinished
                      ? (m.pointsDelta > 0 ? `+${m.pointsDelta} pts` : `${m.pointsDelta} pts`)
                      : 'En juego';

                    return (
                      <div
                        key={m.id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderLeft: `4px solid ${borderLeftColor}`,
                          borderRadius: '12px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        {/* Cabecera del Match: Estado, Deporte, Puntos */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 900,
                              background: badgeBg,
                              color: badgeColor,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              letterSpacing: '0.04em'
                            }}>
                              {badgeText}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                              {m.sportId === 'futbol' ? '⚽ Fútbol' : m.sportId === 'basket' ? '🏀 Basket' : m.sportId === 'voley' ? '🏐 Vóley' : '🎾 Pádel'} {m.formatId?.toUpperCase()}
                            </span>
                          </div>

                          <span style={{
                            fontSize: '12px',
                            fontWeight: 900,
                            color: m.pointsDelta >= 0 ? '#34d399' : '#f87171'
                          }}>
                            {ptsText}
                          </span>
                        </div>

                        {/* Detalles: Horario, Duración y Ubicación */}
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '11px',
                          color: '#94a3b8',
                          padding: '6px 8px',
                          background: 'rgba(0, 0, 0, 0.25)',
                          borderRadius: '8px'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ⏱️ {m.startedAt} - {m.finishedAt} ({m.durationMinutes} min)
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#cbd5e1' }}>
                            <MapPin size={12} color="#10b981" /> {m.venueDistrict}
                          </span>
                        </div>

                        {/* Alineaciones Estilo MOBA: Mi Equipo vs Rivales */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto 1fr',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '2px'
                        }}>
                          {/* Mi Equipo */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase' }}>
                              Mi Equipo
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {m.myTeam?.map((p, pIdx) => (
                                <div
                                  key={p.userId || p.id || pIdx}
                                  title={`${p.name} (${p.rating || 1500} OVR)`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(16, 185, 129, 0.2)'
                                  }}
                                >
                                  <img
                                    src={p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                    alt={p.name}
                                    style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                  <span style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 700, maxWidth: '65px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.name?.split(' ')[0]}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* VS Divider */}
                          <div style={{
                            fontSize: '11px',
                            fontWeight: 900,
                            color: '#f59e0b',
                            background: 'rgba(245, 158, 11, 0.15)',
                            padding: '4px 6px',
                            borderRadius: '6px'
                          }}>
                            VS
                          </div>

                          {/* Rivales */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#f87171', textTransform: 'uppercase' }}>
                              Rivales
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' }}>
                              {m.rivalTeam?.map((p, pIdx) => (
                                <div
                                  key={p.userId || p.id || pIdx}
                                  title={`${p.name} (${p.rating || 1500} OVR)`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(239, 68, 68, 0.2)'
                                  }}
                                >
                                  <span style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 700, maxWidth: '65px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.name?.split(' ')[0]}
                                  </span>
                                  <img
                                    src={p.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                                    alt={p.name}
                                    style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Calificaciones de Fair Play y Puntualidad recibidas */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '14px',
                marginTop: '4px'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                  🎖️ Calificaciones de Rivales
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '4px' }}>
                      <span>⏱️ Puntualidad en Cancha</span>
                      <span style={{ fontWeight: 800, color: '#10b981' }}>98%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: '98%', height: '100%', background: '#10b981' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '4px' }}>
                      <span>🤝 Respeto & Fair Play</span>
                      <span style={{ fontWeight: 800, color: '#3b82f6' }}>100%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '100%', background: '#3b82f6' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '4px' }}>
                      <span>🎯 Nivel Real Acorde</span>
                      <span style={{ fontWeight: 800, color: '#f59e0b' }}>94%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: '94%', height: '100%', background: '#f59e0b' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botón de Cerrar Sesión */}
          <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <LogOut size={15} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal anidado de Carta FUT */}
      {showFUTModal && (
        <PlayerCardFUT
          user={user}
          ratingOverall={glickoRating}
          onClose={() => setShowFUTModal(false)}
        />
      )}
    </div>
  );
}
