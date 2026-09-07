import React, { useState } from 'react';
import { Trophy, Users, Shield, Award, HelpCircle, ChevronDown, Sparkles, UserCheck, Flame } from 'lucide-react';
import FormatSelectorModal from './FormatSelectorModal.jsx';

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
  const [showFormatModal, setShowFormatModal] = useState(false);
  const currentSport = sports.find((s) => s.id === selectedSportId) || sports[0];
  const currentFormat = currentSport?.formats?.find((f) => f.id === selectedFormatId) || currentSport?.formats?.[0];

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
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Selector de Deportes Horizontal */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '2px 0 6px',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
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
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '14px',
                border: isSelected ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isSelected ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.12) 100%)' : 'rgba(255, 255, 255, 0.03)',
                boxShadow: isSelected ? '0 0 15px rgba(16, 185, 129, 0.25)' : 'none',
                color: isSelected ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontWeight: isSelected ? 800 : 600,
                fontSize: '14px'
              }}
            >
              <span style={{ fontSize: '18px' }}>{sport.icon}</span>
              <span>{sport.name}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Tarjeta Principal de Configuración del Partido */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        {/* BOTÓN INTUITIVO DE MODALIDAD (Abre Modal / Bottom Sheet) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Modalidad de Juego
            </span>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
              Toca para cambiar
            </span>
          </div>

          <div
            onClick={() => setShowFormatModal(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.06) 100%)',
              border: '1.5px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '14px',
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
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#10b981',
                color: '#042416',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '13px'
              }}>
                {currentFormat?.playersPerTeam || 1}v{currentFormat?.playersPerTeam || 1}
              </div>

              <div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>
                  {currentFormat?.name || 'Modalidad'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {currentFormat?.playersPerTeam === 1
                    ? '1v1 Duelo Directo'
                    : `${currentFormat?.playersPerTeam} por equipo • ${currentSport?.name}`}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#34d399'
            }}>
              <span>Elegir</span>
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        {/* Resumen de Nivel y Puntos en este deporte */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          padding: '10px 12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Trophy size={16} color="#f59e0b" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff', fontFamily: 'Outfit' }}>
                  {currentProfile ? currentProfile.rating : 1400} pts
                </span>
                <span className={`tier-badge ${getTierClass(currentProfile?.declaredLevel)}`} style={{ padding: '2px 6px', fontSize: '10px' }}>
                  {currentProfile?.declaredLevel || 'Intermedio'}
                </span>
              </div>
              <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>
                {currentProfile?.wins || 0}V - {currentProfile?.losses || 0}D
              </p>
            </div>
          </div>

          <button
            onClick={onOpenQuestionnaire}
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#93c5fd',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <HelpCircle size={12} />
            Calibrar
          </button>
        </div>

        {/* Selector de Modo: Voy Solo vs Convocatoria */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '4px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <button
            onClick={() => setMode?.('solo')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 8px',
              borderRadius: '10px',
              border: mode === 'solo' ? '1px solid rgba(16, 185, 129, 0.6)' : 'none',
              background: mode === 'solo' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.15))' : 'transparent',
              color: mode === 'solo' ? '#fff' : '#94a3b8',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Users size={14} color={mode === 'solo' ? '#10b981' : '#94a3b8'} />
            <span>Voy Solo (Fill)</span>
          </button>

          <button
            onClick={() => setMode?.('squad')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 8px',
              borderRadius: '10px',
              border: mode === 'squad' ? '1px solid rgba(59, 130, 246, 0.6)' : 'none',
              background: mode === 'squad' ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(29, 78, 216, 0.15))' : 'transparent',
              color: mode === 'squad' ? '#fff' : '#94a3b8',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Award size={14} color={mode === 'squad' ? '#3b82f6' : '#94a3b8'} />
            <span>Convocatoria</span>
          </button>
        </div>

        {/* Botón de Acción Principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          {mode === 'solo' ? (
            <button
              onClick={onProceedToRadar}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 900,
                borderRadius: '14px',
                letterSpacing: '0.2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Flame size={18} />
              <span>BUSCAR DESAFÍO EN RADAR ➔</span>
            </button>
          ) : (
            <button
              onClick={onCreateLobby}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 900,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                letterSpacing: '0.2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Users size={18} />
              <span>CREAR SALA DE CONVOCATORIA ➔</span>
            </button>
          )}

          <button
            onClick={onOpenJoinLobbyModal}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '10px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <span>🔗 Unirse a Sala con Código o Enlace</span>
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
