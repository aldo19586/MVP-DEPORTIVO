import React, { useState, useEffect } from 'react';
import { Trophy, Award, Shield, Zap, Sparkles, X, ChevronRight, User } from 'lucide-react';
import PlayerCardFUT from './PlayerCardFUT.jsx';

const GAME_MODES = [
  { id: '1v1', name: '1vs1 Duelos', icon: '⚡', subtitle: 'Singles & Cartas FUT' },
  { id: '2v2', name: '2vs2 Duplas', icon: '👥', subtitle: 'Parejas Oficiales' },
  { id: '3v3', name: '3vs3 Squads', icon: '🛡️', subtitle: 'Tríos & FIBA' },
  { id: '5v5', name: '5vs5 Futsal', icon: '⚽', subtitle: 'Cuadro Completo' }
];

export default function LeaderboardModal({ sports, currentSportId = 'futbol', onClose }) {
  const [selectedSport, setSelectedSport] = useState(currentSportId);
  const [selectedFormat, setSelectedFormat] = useState('1v1');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerForCard, setSelectedPlayerForCard] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard/${selectedSport}/${selectedFormat}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        } else {
          setLeaderboard([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setLeaderboard([]);
        setLoading(false);
      });
  }, [selectedSport, selectedFormat]);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px', padding: '20px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header con botón de cerrar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Trophy size={20} color="#f59e0b" />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                Rankings por Modo de Juego
              </h3>
              <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                Tablas clasificatorias independientes
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Selector de Deporte */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px' }}>
          {sports?.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSport(s.id)}
              style={{
                background: selectedSport === s.id ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                color: selectedSport === s.id ? '#042416' : '#94a3b8',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
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
            </button>
          ))}
        </div>

        {/* Selector de Modos de Juego (1v1, 2v2, 3v3, 5v5) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '4px',
          borderRadius: '12px',
          margin: '10px 0 16px'
        }}>
          {GAME_MODES.map((mode) => {
            const isSelected = selectedFormat === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedFormat(mode.id)}
                style={{
                  background: isSelected ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent',
                  color: isSelected ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 4px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '13px' }}>{mode.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 800, marginTop: '2px' }}>{mode.id}</div>
              </button>
            );
          })}
        </div>

        {/* Contenido de la Tabla de Clasificación */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '13px' }}>
              Cargando posiciones del ranking...
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px 16px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              color: '#94a3b8'
            }}>
              <p style={{ fontSize: '13px', fontWeight: 600 }}>Aún no hay partidos registrados en {selectedFormat}</p>
              <p style={{ fontSize: '11px', marginTop: '4px', color: '#64748b' }}>
                ¡Sé el primero en jugar un match {selectedFormat} y liderar el podio!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {leaderboard.map((item, index) => {
                const isTop3 = index < 3;
                const medalColors = ['#f59e0b', '#94a3b8', '#b45309'];
                const ovr = item.ovr || item.user?.futStats?.ovr || 75;

                return (
                  <div
                    key={item.user.id}
                    style={{
                      background: index === 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                      border: index === 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '14px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    {/* Posición y Avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 900,
                        width: '22px',
                        textAlign: 'center',
                        color: isTop3 ? medalColors[index] : '#64748b'
                      }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>

                      <div style={{ position: 'relative' }}>
                        <img
                          src={item.user.avatar}
                          alt={item.user.name}
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }}
                        />
                        {selectedFormat === '1v1' && (
                          <div style={{
                            position: 'absolute',
                            bottom: '-4px',
                            right: '-4px',
                            background: ovr >= 91 ? '#a855f7' : ovr >= 83 ? '#f59e0b' : '#64748b',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 900,
                            padding: '1px 4px',
                            borderRadius: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                          }}>
                            {ovr}
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                            {item.user.name}
                          </span>
                          {item.user.likesCount > 0 && (
                            <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>
                              👍 {item.user.likesCount}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {item.user.district} • {item.wins}V - {item.losses}D
                        </div>
                      </div>
                    </div>

                    {/* Rating y Acción FUT */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '15px', fontWeight: 900, color: '#fcd34d', fontFamily: 'Outfit' }}>
                          {item.rating}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>
                          pts
                        </span>
                      </div>

                      {selectedFormat === '1v1' && (
                        <button
                          onClick={() => setSelectedPlayerForCard(item.user)}
                          title="Ver Carta FUT oficial"
                          style={{
                            background: 'rgba(251, 191, 36, 0.15)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            color: '#fbbf24',
                            borderRadius: '8px',
                            padding: '6px 8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <span>🎴</span>
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal de Carta FUT del Jugador seleccionado */}
        {selectedPlayerForCard && (
          <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <PlayerCardFUT
              user={selectedPlayerForCard}
              sport={selectedSport}
              onClose={() => setSelectedPlayerForCard(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
