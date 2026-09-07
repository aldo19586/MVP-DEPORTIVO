import React from 'react';
import { X, Users, Check, Sparkles } from 'lucide-react';

export default function FormatSelectorModal({
  sport,
  selectedFormatId,
  onSelectFormat,
  onClose
}) {
  if (!sport) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '20px',
          borderRadius: '24px 24px 16px 16px',
          background: 'linear-gradient(180deg, #131b2e 0%, #0a0e1a 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.8)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>{sport.icon}</span>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Modalidad de {sport.name}
              </h3>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>
                Elige la cantidad de jugadores por equipo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
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

        {/* Lista de Formatos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sport.formats?.map((fmt) => {
            const isSelected = fmt.id === selectedFormatId;
            return (
              <div
                key={fmt.id}
                onClick={() => {
                  onSelectFormat(fmt.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.08) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  boxShadow: isSelected ? '0 0 20px rgba(16, 185, 129, 0.2)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
                    color: isSelected ? '#042416' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '13px'
                  }}>
                    {fmt.playersPerTeam}v{fmt.playersPerTeam}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: isSelected ? '#fff' : '#cbd5e1' }}>
                        {fmt.name}
                      </span>
                      {fmt.id === '1v1' && (
                        <span style={{ fontSize: '9px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                          PVP
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                      {fmt.playersPerTeam === 1
                        ? '1 jugador vs 1 rival directo'
                        : `${fmt.playersPerTeam} jugadores por lado en cancha`}
                    </p>
                  </div>
                </div>

                {isSelected ? (
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#042416'
                  }}>
                    <Check size={15} strokeWidth={3} />
                  </div>
                ) : (
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
