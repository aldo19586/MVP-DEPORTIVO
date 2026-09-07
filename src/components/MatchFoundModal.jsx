import React from 'react';
import { Trophy, Swords, MapPin, ArrowRight, Shield } from 'lucide-react';

export default function MatchFoundModal({ match, currentUserId, onEnterChat }) {
  if (!match) return null;

  const inTeamA = match.teamA.some((p) => p.id === currentUserId || p.userId === currentUserId);
  const myTeam = inTeamA ? match.teamA : match.teamB;
  const rivalTeam = inTeamA ? match.teamB : match.teamA;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: '24px', textAlign: 'center' }}>
        {/* Badge superior */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(16, 185, 129, 0.2)',
          border: '1px solid #10b981',
          color: '#6ee7b7',
          padding: '4px 12px',
          borderRadius: '99px',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: '12px'
        }}>
          <Swords size={14} /> ¡Match Confirmado!
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>
          ¡DESAFÍO ENCONTRADO!
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
          {match.sportId?.toUpperCase()} • {match.formatId?.toUpperCase()}
        </p>

        {/* Versus Cards */}
        <div className="versus-container" style={{ alignItems: 'center' }}>
          {/* Mi Equipo */}
          <div className="team-card mine" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981' }}>
                TU EQUIPO
              </span>
              <span style={{ fontSize: '10px', color: '#6ee7b7', fontWeight: 700 }}>
                {myTeam.length} {myTeam.length === 1 ? 'jugador' : 'jugadores'}
              </span>
            </div>

            {myTeam.length === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img
                  src={myTeam[0].avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=me'}
                  alt={myTeam[0].name}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #10b981', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
                  {myTeam[0].name}
                </span>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, fontFamily: 'Outfit' }}>
                  {myTeam[0].position ? `${myTeam[0].position} • ` : ''}{myTeam[0].rating || 1400} pts
                </span>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '210px',
                overflowY: 'auto',
                paddingRight: '2px'
              }}>
                {myTeam.map((player, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '8px',
                    padding: '4px 6px'
                  }}>
                    <img
                      src={player.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=me'}
                      alt={player.name}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid #10b981', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {player.name}
                      </div>
                      <div style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 700 }}>
                        {player.position ? `${player.position} • ` : ''}{player.rating || 1400} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Badge VS */}
          <div className="versus-badge">
            VS
          </div>

          {/* Equipo Rival */}
          <div className="team-card rival" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444' }}>
                RIVAL
              </span>
              <span style={{ fontSize: '10px', color: '#fca5a5', fontWeight: 700 }}>
                {rivalTeam.length} {rivalTeam.length === 1 ? 'jugador' : 'jugadores'}
              </span>
            </div>

            {rivalTeam.length === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img
                  src={rivalTeam[0].avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=rival'}
                  alt={rivalTeam[0].name}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #ef4444', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
                  {rivalTeam[0].name}
                </span>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, fontFamily: 'Outfit' }}>
                  {rivalTeam[0].position ? `${rivalTeam[0].position} • ` : ''}{rivalTeam[0].rating || 1400} pts
                </span>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '210px',
                overflowY: 'auto',
                paddingRight: '2px'
              }}>
                {rivalTeam.map((player, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '8px',
                    padding: '4px 6px'
                  }}>
                    <img
                      src={player.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=rival'}
                      alt={player.name}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid #ef4444', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {player.name}
                      </div>
                      <div style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 700 }}>
                        {player.position ? `${player.position} • ` : ''}{player.rating || 1400} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '10px',
          fontSize: '12px',
          color: '#94a3b8',
          marginBottom: '16px'
        }}>
          💡 <strong>Próximo paso:</strong> Ingresa a la sala privada para acordar la cancha, hora y reglas entre ustedes.
        </div>

        <button
          onClick={onEnterChat}
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '15px' }}
        >
          <span>Ir a la Sala de Coordinación</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
