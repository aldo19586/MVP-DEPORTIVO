import React, { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import PlayerCardFUT from './PlayerCardFUT.jsx';

const GAME_MODES = [
  { id: '1v1', label: '1 vs 1' },
  { id: '2v2', label: '2 vs 2' },
  { id: '3v3', label: '3 vs 3' },
  { id: '5v5', label: '5 vs 5' }
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '440px',
          width: '94%',
          padding: '20px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>
              Tabla de Clasificación
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>
              Ranking por deporte y modalidad
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
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
        </div>

        {/* Selector de Deporte */}
        <div
          className="hide-scrollbar"
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '8px',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {sports?.map((s) => {
            const isSelected = selectedSport === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSport(s.id)}
                style={{
                  background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? '#10b981' : '#94a3b8',
                  border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '7px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <span>{s.icon}</span>
                <span>{s.name}</span>
              </button>
            );
          })}
        </div>

        {/* Selector de Modos de Juego (1v1, 2v2, 3v3, 5v5) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '4px',
          borderRadius: '10px',
          margin: '8px 0 14px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          {GAME_MODES.map((mode) => {
            const isSelected = selectedFormat === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedFormat(mode.id)}
                style={{
                  background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: isSelected ? '#fff' : '#94a3b8',
                  border: isSelected ? '1px solid #10b981' : '1px solid transparent',
                  borderRadius: '8px',
                  padding: '7px 4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: isSelected ? 700 : 500,
                  textAlign: 'center',
                  transition: 'all 0.15s'
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Contenido de la Tabla de Clasificación */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '13px' }}>
              Cargando posiciones...
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px 16px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              color: '#94a3b8'
            }}>
              <p style={{ fontSize: '13px', fontWeight: 600 }}>Sin partidos registrados en {selectedFormat}</p>
              <p style={{ fontSize: '11px', marginTop: '4px', color: '#64748b' }}>
                Completa un partido en esta modalidad para clasificar
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {leaderboard.map((item, index) => {
                const rankColors = ['#f59e0b', '#cbd5e1', '#d97706'];
                const ovr = item.ovr || item.user?.futStats?.ovr || 75;

                return (
                  <div
                    key={item.user.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    {/* Posición y Avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        width: '24px',
                        textAlign: 'center',
                        color: index < 3 ? rankColors[index] : '#64748b',
                        flexShrink: 0
                      }}>
                        #{index + 1}
                      </span>

                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img
                          src={item.user.avatar}
                          alt={item.user.name}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        />
                        {selectedFormat === '1v1' && (
                          <div style={{
                            position: 'absolute',
                            bottom: '-3px',
                            right: '-3px',
                            background: '#1e293b',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: '4px'
                          }}>
                            {ovr}
                          </div>
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.user.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {item.user.district} • {item.wins}V - {item.losses}D
                        </div>
                      </div>
                    </div>

                    {/* Rating y Acción FUT */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                          {item.rating}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
                          pts
                        </span>
                      </div>

                      {selectedFormat === '1v1' && (
                        <button
                          onClick={() => setSelectedPlayerForCard(item.user)}
                          title="Ver Ficha de Jugador"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94a3b8',
                            borderRadius: '8px',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
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

        {/* Modal de Carta del Jugador */}
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
