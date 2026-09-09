import React, { useState } from 'react';
import { Award, CheckCircle, HelpCircle, X } from 'lucide-react';

export default function QuestionnaireModal({
  sportName,
  formatName,
  onSave,
  onClose
}) {
  const [level, setLevel] = useState('Intermedio');
  const [frequency, setFrequency] = useState('1 a 2 veces por semana');
  const [experience, setExperience] = useState('2 a 4 años');

  const LEVELS = [
    {
      id: 'Principiante',
      title: 'Principiante (1100 pts)',
      desc: 'Aprendiendo las reglas básicas, juego recreativo casual sin presión competitiva.',
      badgeClass: 'tier-principiante'
    },
    {
      id: 'Intermedio',
      title: 'Intermedio (1400 pts)',
      desc: 'Buen control técnico, juegas seguido con amigos, comprendes tácticas de posicionamiento.',
      badgeClass: 'tier-intermedio'
    },
    {
      id: 'Avanzado',
      title: 'Avanzado (1700 pts)',
      desc: 'Alta resistencia, buena técnica individual, compites en torneos amateurs o ligas de distrito.',
      badgeClass: 'tier-avanzado'
    },
    {
      id: 'Competitivo',
      title: 'Competitivo / Semi-Pro (2000 pts)',
      desc: 'Experiencia federada o ligas de alto nivel, nivel físico y táctico riguroso.',
      badgeClass: 'tier-competitivo'
    }
  ];

  const handleConfirm = () => {
    onSave(level);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              Test de Nivel Deportivo
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Nivel inicial para {sportName} ({formatName})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
              ¿Con qué nivel te identificas en esta modalidad?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {LEVELS.map((lvl) => {
                const isSelected = level === lvl.id;
                return (
                  <div
                    key={lvl.id}
                    onClick={() => setLevel(lvl.id)}
                    style={{
                      border: isSelected ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{lvl.title}</span>
                      {isSelected && <CheckCircle size={18} color="#10b981" />}
                    </div>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                      {lvl.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              ¿Con qué frecuencia juegas?
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '10px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            >
              <option value="Menos de 1 vez al mes">Menos de 1 vez al mes</option>
              <option value="1 a 2 veces por semana">1 a 2 veces por semana</option>
              <option value="3 a más veces por semana">3 o más veces por semana</option>
            </select>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '12px',
            color: '#93c5fd'
          }}>
            Tu puntaje se irá calibrando automáticamente según los resultados de tus partidos.
          </div>

          <button
            onClick={handleConfirm}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '4px' }}
          >
            Confirmar Nivel
          </button>
        </div>
      </div>
    </div>
  );
}
