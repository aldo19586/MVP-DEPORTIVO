import React, { useState, useEffect } from 'react';
import { Target, ArrowLeft } from 'lucide-react';

export default function RadarScreen({
  user,
  sport,
  format,
  currentProfile,
  isSearching,
  location,
  squadMembers = [],
  onOpenMapModal,
  onStartSearch,
  onCancelSearch,
  onForceDemoMatch,
  onBackToSports
}) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    let timer;
    if (isSearching) {
      timer = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSec(0);
    }
    return () => clearInterval(timer);
  }, [isSearching]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Barra Superior: Volver y Datos del Deporte */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '10px 14px'
      }}>
        <button
          onClick={onBackToSports}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ArrowLeft size={16} />
          <span>Cambiar Deporte</span>
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#cbd5e1'
        }}>
          <span>{sport?.icon} {sport?.name}</span>
          <span style={{ color: '#64748b' }}>•</span>
          <span style={{ color: '#10b981', fontWeight: 700 }}>{format?.name || format?.id}</span>
          <span style={{ color: '#64748b' }}>•</span>
          <span style={{ color: '#f59e0b', fontWeight: 800 }}>{currentProfile?.rating || 1400} pts</span>
        </div>
      </div>

      {/* Visualizador de Radar / Sonar */}
      <div style={{
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Selector de Radio en la esquina izquierda */}
        <div style={{ position: 'absolute', top: '14px', left: '16px' }}>
          <button
            onClick={onOpenMapModal}
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '99px',
              padding: '4px 10px',
              color: '#34d399',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Target size={13} color="#10b981" />
            <span>Radio: {location?.radiusKm || 6} km ({location?.district || 'Surco'})</span>
          </button>
        </div>

        {/* Círculo Central de Radar */}
        <div className="radar-container" style={{ margin: '20px 0 14px' }}>
          <div className="radar-circle">
            <div className="radar-circle-inner">
              {isSearching && <div className="radar-beam"></div>}
              {squadMembers && squadMembers.length > 1 ? (
                <div className="radar-squad-wrapper">
                  {squadMembers.slice(0, 3).map((member, idx) => (
                    <div
                      key={member.id || idx}
                      className="radar-squad-item"
                      style={{
                        marginLeft: idx === 0 ? 0 : '-18px',
                        zIndex: 10 + idx
                      }}
                    >
                      <img
                        src={member.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + idx}
                        alt={member.name}
                        className="radar-squad-avatar"
                        title={member.name}
                      />
                      <span style={{
                        fontSize: '9px',
                        background: 'rgba(15, 23, 42, 0.95)',
                        color: '#34d399',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        border: '1px solid #10b981',
                        marginTop: '-6px',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        maxWidth: '70px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {member.name?.split(' ')[0] || 'Jugador'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <img
                  src={user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                  alt="user"
                  className="radar-center-avatar"
                />
              )}
            </div>
          </div>
        </div>

        {/* Indicador y Tiempo de Búsqueda (Único, sin duplicidad) */}
        {isSearching && (
          <div style={{
            margin: '0 0 10px 0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid #10b981',
            borderRadius: '99px',
            padding: '5px 14px'
          }}>
            <div style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981',
              animation: 'pulse 1.2s infinite'
            }}></div>
            <span style={{ fontFamily: 'Outfit', fontSize: '14px', fontWeight: 800, color: '#fff' }}>
              {formatTime(elapsedSec)}
            </span>
            <span style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: 600 }}>
              {squadMembers && squadMembers.length > 1 ? 'Buscando equipo rival' : 'Buscando rival'}
            </span>
          </div>
        )}

        {/* Estado y Subtítulo Conciso */}
        <div style={{ textAlign: 'center', maxWidth: '320px', zIndex: 2 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
            {isSearching
              ? (squadMembers && squadMembers.length > 1 ? 'Buscando Rival para el Equipo' : 'Buscando Rival')
              : '¿Listo para Jugar?'}
          </h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
            {isSearching
              ? `Radio de ${location?.radiusKm || 6} km • Rating: ~${currentProfile?.rating || 1400} pts`
              : `Emparejaremos automáticamente con un rival en tu zona.`}
          </p>
        </div>

        {/* Botones de Acción */}
        <div style={{ width: '100%', maxWidth: '320px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {!isSearching ? (
            <button
              onClick={onStartSearch}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '14px',
                borderRadius: '12px',
                fontWeight: 800
              }}
            >
              Buscar Partido
            </button>
          ) : (
            <button
              onClick={onCancelSearch}
              className="btn btn-danger"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                borderRadius: '12px',
                fontWeight: 700
              }}
            >
              Cancelar Búsqueda
            </button>
          )}

          {/* Botón de prueba instantánea */}
          <button
            onClick={onForceDemoMatch}
            style={{
              width: '100%',
              fontSize: '12px',
              padding: '9px',
              borderRadius: '10px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s'
            }}
          >
            Rival de Prueba (Bot)
          </button>
        </div>
      </div>
    </div>
  );
}
