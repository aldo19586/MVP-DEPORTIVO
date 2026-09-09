import React, { useState } from 'react';
import {
  X,
  MapPin,
  Trophy,
  Target,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldCheck
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
  const [activeTab, setActiveTab] = useState('perfil'); // 'perfil' | 'historial'
  const [showFUTModal, setShowFUTModal] = useState(false);
  const [matchHistory, setMatchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Cargar historial de partidos del jugador
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
  const glickoRating = currentProfile?.rating || 1400;

  // Stats acumuladas del jugador (solo partidas finalizadas)
  const finishedHistory = (matchHistory || []).filter(m => m.status === 'finished');
  const matchesPlayed = finishedHistory.length > 0 ? finishedHistory.length : (currentProfile?.matchesPlayed || 0);
  const wins = finishedHistory.length > 0 ? finishedHistory.filter(m => m.won).length : (currentProfile?.wins || 0);
  const losses = finishedHistory.length > 0 ? finishedHistory.filter(m => !m.won && !m.draw).length : (currentProfile?.losses || 0);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          width: '92%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          borderRadius: '20px',
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Header con Avatar, Datos y Accesos Directos (Carta FUT / Admin) */}
        <div style={{
          position: 'relative',
          padding: '18px 18px 14px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user.name}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                border: isAdmin ? '2px solid #ef4444' : '2px solid #10b981',
                objectFit: 'cover'
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </h2>
                {isAdmin && (
                  <span style={{ fontSize: '9px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                    ADMIN
                  </span>
                )}
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} color="#10b981" /> {location?.district || user.district || 'Lima'}
              </p>
            </div>
          </div>

          {/* Chips compactos de acción en cabecera */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={() => setShowFUTModal(true)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              <span>🎴 Carta FUT</span>
              <span style={{ color: '#fff', fontWeight: 800 }}>• {glickoRating} OVR</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAdminDashboard();
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
              >
                <ShieldCheck size={13} />
                <span>Panel Admin</span>
              </button>
            )}
          </div>

          {/* Selector de Pestañas */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
            <button
              onClick={() => setActiveTab('perfil')}
              style={{
                flex: 1,
                padding: '7px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'perfil' ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'perfil' ? '#042416' : '#94a3b8',
                transition: 'all 0.15s'
              }}
            >
              Mi Perfil
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              style={{
                flex: 1,
                padding: '7px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'historial' ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'historial' ? '#042416' : '#94a3b8',
                transition: 'all 0.15s'
              }}
            >
              Historial de Partidos
            </button>
          </div>
        </div>

        {/* Contenido según pestaña activa */}
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>
          {activeTab === 'perfil' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Reputación / Calificaciones de Rivales */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '12px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Reputación y Fair Play
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '3px' }}>
                      <span>Puntualidad</span>
                      <span style={{ fontWeight: 800, color: '#10b981' }}>98%</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: '98%', height: '100%', background: '#10b981' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '3px' }}>
                      <span>Fair Play</span>
                      <span style={{ fontWeight: 800, color: '#3b82f6' }}>100%</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '100%', background: '#3b82f6' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '3px' }}>
                      <span>Nivel Real Acorde</span>
                      <span style={{ fontWeight: 800, color: '#f59e0b' }}>94%</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: '94%', height: '100%', background: '#f59e0b' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Accesos Rápidos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Ajustes y Competencia
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
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={15} color="#f59e0b" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
                      Tabla de Clasificación
                    </span>
                  </div>
                  <ChevronRight size={15} color="#64748b" />
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
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={15} color="#10b981" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
                      Radio y Zona GPS ({location?.radiusKm || 6} km)
                    </span>
                  </div>
                  <ChevronRight size={15} color="#64748b" />
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
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HelpCircle size={15} color="#3b82f6" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
                      Calibrar Nivel Deportivo
                    </span>
                  </div>
                  <ChevronRight size={15} color="#64748b" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'historial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflow: 'hidden' }}>
              {/* Resumen Métrico */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '8px',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff', fontFamily: 'Outfit' }}>
                    {matchesPlayed}
                  </span>
                  <p style={{ fontSize: '10px', color: '#94a3b8', margin: '2px 0 0' }}>Partidos</p>
                </div>

                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  padding: '8px',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#34d399', fontFamily: 'Outfit' }}>
                    {wins}
                  </span>
                  <p style={{ fontSize: '10px', color: '#6ee7b7', margin: '2px 0 0' }}>Victorias</p>
                </div>

                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  padding: '8px',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#f87171', fontFamily: 'Outfit' }}>
                    {losses}
                  </span>
                  <p style={{ fontSize: '10px', color: '#fca5a5', margin: '2px 0 0' }}>Derrotas</p>
                </div>
              </div>

              {/* Contenedor Encapsulado del Historial (sin crecimiento infinito) */}
              <div
                className="hide-scrollbar"
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingRight: '2px'
                }}
              >
                {historyLoading ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '12px' }}>
                    Cargando historial...
                  </div>
                ) : finishedHistory.length === 0 ? (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '24px 14px',
                    textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', margin: 0 }}>
                      Sin partidos registrados aún
                    </p>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '3px 0 0' }}>
                      Juega tu primer match en el Radar.
                    </p>
                  </div>
                ) : (
                  finishedHistory.map((m) => {
                    const isWin = m.won;
                    const isDraw = m.draw;
                    const isFinished = m.status === 'finished';

                    const badgeColor = !isFinished
                      ? '#c084fc'
                      : isWin
                      ? '#34d399'
                      : isDraw
                      ? '#fbbf24'
                      : '#f87171';

                    const badgeBg = !isFinished
                      ? 'rgba(168, 85, 247, 0.15)'
                      : isWin
                      ? 'rgba(16, 185, 129, 0.15)'
                      : isDraw
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)';

                    const badgeText = !isFinished
                      ? 'EN CURSO'
                      : isWin
                      ? 'VICTORIA'
                      : isDraw
                      ? 'EMPATE'
                      : 'DERROTA';

                    const ptsText = isFinished
                      ? (m.pointsDelta > 0 ? `+${m.pointsDelta} pts` : `${m.pointsDelta} pts`)
                      : 'En juego';

                    return (
                      <div
                        key={m.id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderLeft: `3px solid ${badgeColor}`,
                          borderRadius: '10px',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        {/* Cabecera del Match */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              background: badgeBg,
                              color: badgeColor,
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {badgeText}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0' }}>
                              {m.sportId?.toUpperCase()} {m.formatId?.toUpperCase()}
                            </span>
                          </div>

                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: m.pointsDelta >= 0 ? '#34d399' : '#f87171'
                          }}>
                            {ptsText}
                          </span>
                        </div>

                        {/* Alineación Mini vs Rival */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: '#94a3b8'
                        }}>
                          <span>vs {m.rivalTeam?.[0]?.name || 'Rival'}</span>
                          <span>{m.venueDistrict || 'Lima'} • {m.durationMinutes || 60}m</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Botón de Cerrar Sesión */}
          <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '10px',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                background: 'rgba(239, 68, 68, 0.06)',
                color: '#f87171',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <LogOut size={13} />
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

