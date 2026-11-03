import React, { useState } from 'react';
import { Scale, CheckCircle, XCircle, AlertTriangle, MessageSquare, ShieldAlert } from 'lucide-react';
import { resolveDisputeApi } from '../services/api';

export default function DisputeResolutionView({ activeMatches = [] }) {
  // Buscar partidos con estado 'disputed'
  const disputedMatches = activeMatches.filter((m) => m.status === 'disputed' || m.disputeAlert);

  const [resolvedIds, setResolvedIds] = useState([]);
  const selectedMatch = disputedMatches.find(match => !resolvedIds.includes(match.id));
  const [resolvedStatus, setResolvedStatus] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleResolve = async (winnerTeam) => {
    if (!selectedMatch || saving) return;
    setSaving(true); setError('');

    try {
      await resolveDisputeApi(selectedMatch.id, winnerTeam);
      setResolvedIds(ids => [...ids, selectedMatch.id]);

      setResolvedStatus(`Disputa resuelta a favor de ${winnerTeam === 'teamA' ? 'Equipo A' : 'Equipo B'}. Puntos asignados (+35 pts) y rating actualizado.`);
      setTimeout(() => setResolvedStatus(null), 6000);
    } catch (e) {
      setError(e.message);
    } finally { setSaving(false); }
  };

  if (!selectedMatch) return <p role="status">{resolvedStatus || 'No hay disputas pendientes.'}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Sala de Resolución de Disputas (Arbitraje SuperAdmin)</h2>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          Interfaz en dos columnas para contrastar la versión de ambos capitanes, revisar el chat del partido y dictar el resultado definitivo.
        </p>
      </div>

      {resolvedStatus && (
        <div style={{
          padding: '14px 20px',
          borderRadius: '8px',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          fontWeight: '600'
        }}>
          ✅ {resolvedStatus}
        </div>
      )}

      {error && <p role="alert">No se resolvió la disputa: {error}</p>}
      {/* Disputa Activa: Comparativa en 2 Columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Columna Capitán A */}
        <div className="admin-card" style={{ borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="badge badge-cyan">Capitán A • Reportero Inicial</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Rating Glicko-2: {selectedMatch.teamA[0]?.rating || 1820}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <img
              src={selectedMatch.teamA[0]?.avatar}
              alt=""
              style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <h3 style={{ fontSize: '18px' }}>{selectedMatch.teamA[0]?.name}</h3>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>📍 {selectedMatch.teamA[0]?.district}</div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              Resultado Reclamado por Capitán A:
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#06b6d4', marginTop: '4px' }}>
              {selectedMatch.teamA[0]?.claim || 'Victoria Equipo A'}
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={saving}
            onClick={() => handleResolve('teamA')}
          >
            <CheckCircle size={16} /> Declarar Ganador Oficial: Equipo A (+35 pts)
          </button>
        </div>

        {/* Columna Capitán B */}
        <div className="admin-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="badge badge-amber">Capitán B • Disputante</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Rating Glicko-2: {selectedMatch.teamB[0]?.rating || 1780}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <img
              src={selectedMatch.teamB[0]?.avatar}
              alt=""
              style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <h3 style={{ fontSize: '18px' }}>{selectedMatch.teamB[0]?.name}</h3>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>📍 {selectedMatch.teamB[0]?.district}</div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              Motivo Formal de Disputa Registrado:
            </div>
            <div style={{ fontSize: '13px', color: '#fca5a5', marginTop: '4px', fontStyle: 'italic' }}>
              "{selectedMatch.disputeAlert?.reason || 'Discrepancia en el marcador final'}"
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            disabled={saving}
            onClick={() => handleResolve('teamB')}
          >
            <CheckCircle size={16} /> Declarar Ganador Oficial: Equipo B (+35 pts)
          </button>
        </div>

      </div>

      {/* Transcripción de Chat del Partido */}
      <div className="admin-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <MessageSquare size={16} color="#06b6d4" />
          <h3 style={{ fontSize: '14px' }}>Auditoría de Chat en Vivo del Partido (#{selectedMatch.id})</h3>
        </div>

        <div style={{
          backgroundColor: '#090d16',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '14px',
          maxHeight: '180px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {selectedMatch.chatMessages?.map((msg, idx) => (
            <div key={idx} style={{ fontSize: '12px' }}>
              <strong style={{ color: msg.senderName.includes('Carlos') ? '#06b6d4' : '#f59e0b' }}>
                {msg.senderName}:
              </strong>{' '}
              <span style={{ color: '#cbd5e1' }}>{msg.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
