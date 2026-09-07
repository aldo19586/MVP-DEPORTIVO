import React, { useState, useEffect } from 'react';
import { Crosshair, Users, UserCheck, Shield, Flame, MapPin, Zap, Clock, Target, ArrowLeft } from 'lucide-react';

export default function RadarScreen({
  user,
  sport,
  format,
  currentProfile,
  isSearching,
  mode,
  setMode,
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
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Barra de Navegación para Volver a Pantalla 1 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '10px 14px'
      }}>
        <button
          onClick={onBackToSports}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#38bdf8',
            fontSize: '13px',
            fontWeight: 800,
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
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '4px 10px',
          borderRadius: '8px',
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
        background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.06) 0%, rgba(15, 23, 42, 0.8) 70%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '30px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '14px', left: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={onOpenMapModal}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '99px',
              padding: '4px 10px',
              color: '#6ee7b7',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.2s ease'
            }}
            title="Toca para definir tu radio en el mapa interactivo"
          >
            <Target size={13} color="#10b981" />
            <span>Radio: {location?.radiusKm || 6} km ({location?.district || 'Surco'})</span>
            <span style={{ color: '#94a3b8', fontSize: '9px' }}>🗺️ Cambiar Radio</span>
          </button>
        </div>

        <div style={{ position: 'absolute', top: '14px', right: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Flame size={14} color="#f59e0b" />
          <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>
            {isSearching ? 'Buscando...' : 'Radar Activo'}
          </span>
        </div>

        <div className="radar-container" style={{ margin: '15px 0' }}>
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

        {/* Contador de tiempo en vivo integrado en el Radar */}
        {isSearching && (
          <div style={{
            margin: '0 0 14px 0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            borderRadius: '99px',
            padding: '6px 16px',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981'
            }}></div>
            <span style={{ fontFamily: 'Outfit', fontSize: '15px', fontWeight: 800, color: '#fff' }}>
              {formatTime(elapsedSec)}
            </span>
            <span style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: 600 }}>
              {squadMembers && squadMembers.length > 1 ? 'buscando equipo rival' : 'buscando rival'}
            </span>
          </div>
        )}

        <div style={{ textAlign: 'center', maxWidth: '340px', zIndex: 2 }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
            {isSearching
              ? (squadMembers && squadMembers.length > 1
                  ? `Buscando Rival ${format?.id?.toUpperCase() || ''} para tu Equipo...`
                  : 'Escaneando Canchas en tu Radio...')
              : '¿Listo para el Desafío?'}
          </h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
            {isSearching
              ? (squadMembers && squadMembers.length > 1
                  ? `Buscando un equipo rival online de la misma modalidad (${format?.name || format?.id}) para ${squadMembers.map((m) => m.name).join(' & ')} en un radio de ${location?.radiusKm || 6} km.`
                  : `Buscando rival en un radio de ${location?.radiusKm || 6} km a la redonda (Rating: ~${currentProfile?.rating || 1400} pts)`)
              : `Ajusta tu radio en el mapa. El sistema empareja rivales en cualquier cancha dentro de tus km seleccionados.`}
          </p>
        </div>

        {/* Botón Principal de Búsqueda */}
        <div style={{ width: '100%', maxWidth: '340px', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {!isSearching ? (
            <button
              onClick={onStartSearch}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '15px',
                borderRadius: '16px',
                letterSpacing: '0.02em'
              }}
            >
              <Crosshair size={20} />
              BUSCAR DESAFÍO PVP ⚡
            </button>
          ) : (
            <button
              onClick={onCancelSearch}
              className="btn btn-danger"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '14px',
                borderRadius: '14px'
              }}
            >
              Cancelar Búsqueda
            </button>
          )}

          {/* Botón de prueba instantánea */}
          <button
            onClick={onForceDemoMatch}
            className="btn btn-secondary"
            style={{
              width: '100%',
              fontSize: '12px',
              padding: '10px',
              borderRadius: '12px',
              gap: '6px'
            }}
          >
            <Zap size={14} color="#f59e0b" />
            Probar Match Instantáneo (Rival Bot Demo)
          </button>
        </div>
      </div>

      {/* Reglas y Garantías de Fair Play */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '14px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <Shield size={24} color="#10b981" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
          <strong style={{ color: '#fff' }}>Garantía de Juego Limpio:</strong> Ambos equipos reportan el resultado tras el pitazo final. Los ratings de Glicko-2 se ajustan matemáticamente sin trampas.
        </div>
      </div>
    </div>
  );
}
