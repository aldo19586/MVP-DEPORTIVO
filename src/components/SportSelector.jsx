import React from 'react';
import { Trophy, Users, Shield, Award, HelpCircle } from 'lucide-react';

export default function SportSelector({
  sports,
  selectedSportId,
  onSelectSport,
  selectedFormatId,
  onSelectFormat,
  currentProfile,
  onOpenQuestionnaire,
  mode = 'solo',
  setMode,
  onProceedToRadar,
  onCreateLobby,
  onOpenJoinLobbyModal
}) {
  const currentSport = sports.find((s) => s.id === selectedSportId) || sports[0];

  const getTierClass = (level) => {
    switch (level) {
      case 'Principiante': return 'tier-principiante';
      case 'Intermedio': return 'tier-intermedio';
      case 'Avanzado': return 'tier-avanzado';
      case 'Competitivo': return 'tier-competitivo';
      default: return 'tier-intermedio';
    }
  };

  return (
    <div style={{ padding: '0 16px', marginBottom: '16px' }}>
      {/* Selector de Deporte */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollbarWidth: 'none'
      }}>
        {sports.map((sport) => {
          const isSelected = sport.id === selectedSportId;
          return (
            <button
              key={sport.id}
              onClick={() => {
                onSelectSport(sport.id);
                // Autoseleccionar primer formato activo
                if (sport.formats && sport.formats.length > 0) {
                  onSelectFormat(sport.formats[0].id);
                }
              }}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '12px',
                border: isSelected ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isSelected ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))' : 'rgba(255, 255, 255, 0.03)',
                color: isSelected ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '14px'
              }}
            >
              <span style={{ fontSize: '18px' }}>{sport.icon}</span>
              <span>{sport.name}</span>
            </button>
          );
        })}
      </div>

      {/* Selector de Formato del Deporte Seleccionado */}
      {currentSport && (
        <div style={{
          marginTop: '12px',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Modalidad de Juego
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Configurable desde BD
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {currentSport.formats.map((fmt) => {
              const isSelected = fmt.id === selectedFormatId;
              return (
                <button
                  key={fmt.id}
                  onClick={() => onSelectFormat(fmt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#042416' : '#cbd5e1'
                  }}
                >
                  <Users size={14} />
                  <span>{fmt.name}</span>
                </button>
              );
            })}
          </div>

          {/* Tarjeta de Nivel y Rating para este formato específico */}
          <div style={{
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Trophy size={18} color="#f59e0b" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff', fontFamily: 'Outfit' }}>
                    {currentProfile ? currentProfile.rating : 1400} pts
                  </span>
                  <span className={`tier-badge ${getTierClass(currentProfile?.declaredLevel)}`}>
                    {currentProfile?.declaredLevel || 'Intermedio'}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b' }}>
                  Glicko-2 (±{currentProfile?.rd || 300} RD) • {currentProfile?.wins || 0}V - {currentProfile?.losses || 0}D
                </p>
              </div>
            </div>

            <button
              onClick={onOpenQuestionnaire}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '6px 10px', gap: '4px' }}
              title="Calibrar nivel inicial con test rápido"
            >
              <HelpCircle size={13} />
              Calibrar Nivel
            </button>
          </div>

          {/* Selector de Modo: Voy Solo vs Convocatoria con Amigos */}
          <div style={{
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px'
          }}>
            <button
              onClick={() => setMode?.('solo')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '12px 10px',
                borderRadius: '12px',
                border: mode === 'solo' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                background: mode === 'solo' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                color: mode === 'solo' ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color={mode === 'solo' ? '#10b981' : '#94a3b8'} />
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Voy Solo (Fill)</span>
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                Búscame compañero(s) por radar
              </span>
            </button>

            <button
              onClick={() => setMode?.('squad')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '12px 10px',
                borderRadius: '12px',
                border: mode === 'squad' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                background: mode === 'squad' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                color: mode === 'squad' ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={16} color={mode === 'squad' ? '#3b82f6' : '#94a3b8'} />
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Convocatoria</span>
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                Invitar amigos por enlace
              </span>
            </button>
          </div>

          {/* Botón Principal de Avance a Pantalla 2 (Radar o Sala de Convocatoria) */}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mode === 'solo' ? (
              <button
                onClick={onProceedToRadar}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 900,
                  borderRadius: '14px',
                  letterSpacing: '0.3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>CONTINUAR AL RADAR DE BÚSQUEDA ➔</span>
              </button>
            ) : (
              <button
                onClick={onCreateLobby}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 900,
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  letterSpacing: '0.3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Users size={18} />
                <span>CREAR SALA DE CONVOCATORIA (ENLACE) ➔</span>
              </button>
            )}

            <button
              onClick={onOpenJoinLobbyModal}
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>🔗 Unirse a una Sala con Código o Enlace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
