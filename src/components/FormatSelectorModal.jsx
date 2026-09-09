import React from 'react';
import { X, Check } from 'lucide-react';

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
          maxWidth: '440px',
          width: '92%',
          padding: '20px',
          borderRadius: '20px',
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>
              Modalidad de {sport.name}
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0' }}>
              Selecciona el formato de juego
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

        {/* Lista de Formatos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  padding: '12px 14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: isSelected ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#042416' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '12px'
                  }}>
                    {fmt.playersPerTeam}v{fmt.playersPerTeam}
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: isSelected ? '#fff' : '#cbd5e1' }}>
                      {fmt.name}
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                      {fmt.playersPerTeam === 1
                        ? '1 vs 1 individual'
                        : `${fmt.playersPerTeam} por equipo en cancha`}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#042416'
                  }}>
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
