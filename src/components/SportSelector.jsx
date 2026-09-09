import React, { useState } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import FormatSelectorModal from './FormatSelectorModal.jsx';

export default function SportSelector({
  sports = [],
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
  const [showFormatModal, setShowFormatModal] = useState(false);
  const currentSport = sports.find((s) => s.id === selectedSportId) || sports[0];
  const currentFormat = currentSport?.formats?.find((f) => f.id === selectedFormatId) || currentSport?.formats?.[0];

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. Selector de Deportes Segmentado y Responsive */}
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '2px',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {sports.map((sport) => {
          const isSelected = sport.id === selectedSportId;
          return (
            <button
              key={sport.id}
              onClick={() => {
                onSelectSport(sport.id);
                if (sport.formats && sport.formats.length > 0) {
                  onSelectFormat(sport.formats[0].id);
                }
              }}
              style={{
                flex: '1 0 auto',
                minWidth: '95px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: isSelected ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: isSelected ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '13px'
              }}
            >
              <span>{sport.icon}</span>
              <span style={{ whiteSpace: 'nowrap' }}>{sport.name}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Tarjeta Principal de Configuración del Partido */}
      <div style={{
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Selector de Modalidad */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Modalidad
            </span>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
              Cambiar
            </span>
          </div>

          <div
            onClick={() => setShowFormatModal(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#10b981',
                color: '#042416',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '12px'
              }}>
                {currentFormat?.playersPerTeam || 1}v{currentFormat?.playersPerTeam || 1}
              </div>

              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  {currentFormat?.name || 'Modalidad'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {currentFormat?.playersPerTeam === 1
                    ? '1 vs 1 Individual'
                    : `${currentFormat?.playersPerTeam} por equipo • ${currentSport?.name}`}
                </div>
              </div>
            </div>

            <ChevronDown size={16} color="#94a3b8" />
          </div>
        </div>

        {/* Resumen de Nivel y Puntos */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          padding: '10px 12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                {currentProfile ? currentProfile.rating : 1400} pts
              </span>
              <span style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                padding: '2px 6px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 600
              }}>
                {currentProfile?.declaredLevel || 'Intermedio'}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
              {currentProfile?.wins || 0}V - {currentProfile?.losses || 0}D
            </p>
          </div>

          <button
            onClick={onOpenQuestionnaire}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Calibrar
          </button>
        </div>

        {/* Selector de Modo: Buscar Solo vs Convocatoria */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <button
            onClick={() => setMode?.('solo')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px',
              borderRadius: '9px',
              border: mode === 'solo' ? '1px solid #10b981' : 'none',
              background: mode === 'solo' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: mode === 'solo' ? '#fff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Users size={13} color={mode === 'solo' ? '#10b981' : '#94a3b8'} />
            <span>Buscar Solo</span>
          </button>

          <button
            onClick={() => setMode?.('squad')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px',
              borderRadius: '9px',
              border: mode === 'squad' ? '1px solid #10b981' : 'none',
              background: mode === 'squad' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: mode === 'squad' ? '#fff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <span>Crear Equipo</span>
          </button>
        </div>

        {/* Botones de Acción Principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
          {mode === 'solo' ? (
            <button
              onClick={onProceedToRadar}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '14px',
                fontWeight: 800,
                borderRadius: '12px'
              }}
            >
              Buscar Partido
            </button>
          ) : (
            <button
              onClick={onCreateLobby}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '14px',
                fontWeight: 800,
                borderRadius: '12px'
              }}
            >
              Crear Sala
            </button>
          )}

          <button
            onClick={onOpenJoinLobbyModal}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '10px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            Unirse con Código
          </button>
        </div>
      </div>

      {/* Modal de Selección de Formato */}
      {showFormatModal && (
        <FormatSelectorModal
          sport={currentSport}
          selectedFormatId={selectedFormatId}
          onSelectFormat={onSelectFormat}
          onClose={() => setShowFormatModal(false)}
        />
      )}
    </div>
  );
}
