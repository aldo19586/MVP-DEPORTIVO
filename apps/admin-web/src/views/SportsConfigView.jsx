import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Check, Zap } from 'lucide-react';
import { fetchSports, toggleSportFormat } from '../services/api';

export default function SportsConfigView() {
  const [sports, setSports] = useState([]);
  const [syncStatus, setSyncStatus] = useState('');

  useEffect(() => {
    fetchSports().then((res) => {
      if (res.sports) setSports(res.sports);
    });
  }, []);

  const handleToggle = async (sportId, formatId, currentActive) => {
    const nextActive = !currentActive;

    // Optimistic UI update
    setSports((prevSports) =>
      prevSports.map((sport) => {
        if (sport.id !== sportId) return sport;
        return {
          ...sport,
          formats: sport.formats.map((f) => (f.id === formatId ? { ...f, active: nextActive } : f))
        };
      })
    );

    try {
      await toggleSportFormat(sportId, formatId, nextActive);
      setSyncStatus(`Formato ${formatId} de ${sportId} actualizado a ${nextActive ? 'ACTIVO' : 'INACTIVO'} en vivo.`);
      setTimeout(() => setSyncStatus(''), 4000);
    } catch (err) {
      console.error('Error toggling format:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Gestión de Deportes y Formatos en Vivo</h2>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          Toggles interactivos con impacto inmediato en el Radar de la App Móvil sin requerir actualizaciones en tiendas.
        </p>
      </div>

      {syncStatus && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          fontWeight: '600',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Zap size={16} /> {syncStatus}
        </div>
      )}

      {/* Grid de Deportes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        {sports.map((sport) => (
          <div key={sport.id} className="admin-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>{sport.icon}</span>
              <div>
                <h3 style={{ fontSize: '18px' }}>{sport.name}</h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{sport.description}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sport.formats?.map((format) => (
                <div
                  key={format.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#090d16',
                    border: '1px solid #1e293b'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', color: '#f8fafc', fontSize: '13px' }}>
                      {format.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {format.playersPerTeam} vs {format.playersPerTeam} • ID: {format.id}
                    </div>
                  </div>

                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={format.active !== false}
                      onChange={() => handleToggle(sport.id, format.id, format.active !== false)}
                    />
                    <span className="slider" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
