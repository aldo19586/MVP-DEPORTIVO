import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function MatchFoundModal({ match, currentUserId, onEnterChat }) {
  if (!match) return null;

  const inTeamA = match.teamA.some((p) => p.id === currentUserId || p.userId === currentUserId);
  const myTeam = inTeamA ? match.teamA : match.teamB;
  const rivalTeam = inTeamA ? match.teamB : match.teamA;

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: '460px',
          width: '92%',
          padding: '22px 20px',
          textAlign: 'center',
          borderRadius: '20px',
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          padding: '4px 12px',
          borderRadius: '99px',
          fontSize: '11px',
          fontWeight: 700,
          marginBottom: '10px'
        }}>
          <span>{match.sportId?.toUpperCase()} • {match.formatId?.toUpperCase()}</span>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: '0 0 16px' }}>
          ¡Desafío Encontrado!
        </h2>

        {/* Versus Cards */}
        <div className="versus-container" style={{ alignItems: 'center', marginBottom: '16px' }}>
          {/* Mi Equipo */}
          <div className="team-card mine" style={{ flex: 1, minWidth: 0, padding: '14px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                Tu Equipo
              </span>
              <span style={{ fontSize: '10px', color: '#6ee7b7', fontWeight: 700 }}>
                {myTeam.length}
              </span>
            </div>

            {myTeam.length === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img
                  src={myTeam[0].avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=me'}
                  alt={myTeam[0].name}
                  style={{ width: '54px', height: '54px', borderRadius: '50%', border: '2px solid #10b981', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginTop: '6px', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.25 }}>
                  {myTeam[0].name}
                </span>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, fontFamily: 'Outfit', marginTop: '2px' }}>
                  {myTeam[0].position ? `${myTeam[0].position} • ` : ''}{myTeam[0].rating || 1400} pts
                </span>
              </div>
            ) : (
              <div
                className="hide-scrollbar"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '190px',
                  overflowY: 'auto'
                }}
              >
                {myTeam.map((player, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '8px',
                    padding: '4px 6px'
                  }}>
                    <img
                      src={player.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=me'}
                      alt={player.name}
                      style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid #10b981', objectFit: 'cover', flexShrink: 0 }}
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
                        {player.rating || 1400} pts
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
          <div className="team-card rival" style={{ flex: 1, minWidth: 0, padding: '14px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>
                Rival
              </span>
              <span style={{ fontSize: '10px', color: '#fca5a5', fontWeight: 700 }}>
                {rivalTeam.length}
              </span>
            </div>

            {rivalTeam.length === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img
                  src={rivalTeam[0].avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=rival'}
                  alt={rivalTeam[0].name}
                  style={{ width: '54px', height: '54px', borderRadius: '50%', border: '2px solid #ef4444', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginTop: '6px', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.25 }}>
                  {rivalTeam[0].name}
                </span>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, fontFamily: 'Outfit', marginTop: '2px' }}>
                  {rivalTeam[0].position ? `${rivalTeam[0].position} • ` : ''}{rivalTeam[0].rating || 1400} pts
                </span>
              </div>
            ) : (
              <div
                className="hide-scrollbar"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '190px',
                  overflowY: 'auto'
                }}
              >
                {rivalTeam.map((player, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '8px',
                    padding: '4px 6px'
                  }}>
                    <img
                      src={player.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=rival'}
                      alt={player.name}
                      style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid #ef4444', objectFit: 'cover', flexShrink: 0 }}
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
                        {player.rating || 1400} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onEnterChat}
          className="btn btn-primary"
          style={{ width: '100%', padding: '13px', fontSize: '14px', borderRadius: '12px', fontWeight: 800 }}
        >
          <span>Ir a la Sala de Coordinación</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
