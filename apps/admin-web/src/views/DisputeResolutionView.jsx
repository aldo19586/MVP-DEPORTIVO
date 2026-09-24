import React, { useState } from 'react';
import { Scale, CheckCircle, XCircle, AlertTriangle, MessageSquare, ShieldAlert } from 'lucide-react';
import { adminSocket } from '../services/socket';

export default function DisputeResolutionView({ activeMatches = [] }) {
  // Buscar partidos con estado 'disputed'
  const disputedMatches = activeMatches.filter((m) => m.status === 'disputed' || m.disputeAlert);

  // Muestra de demostración si aún no hay disputas abiertas en vivo
  const fallbackDispute = {
    id: 'match_disp_sample_882',
    sportId: 'futbol',
    formatId: '1v1',
    status: 'disputed',
    createdAt: new Date().toISOString(),
    disputeAlert: {
      reportedBy: 'demo_user_3',
      reason: 'El rival marcó que ganó 5-4, pero el resultado real fue 5-3 a mi favor en Cancha El Golazo de Surco.',
      timestamp: Date.now() - 1000 * 60 * 15
    },
    teamA: [
      {
        id: 'demo_user_1',
        name: 'Carlos Mendoza',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        district: 'Surco, Lima',
        rating: 1820,
        claim: 'Victoria Equipo A (Carlos Mendoza)'
      }
    ],
    teamB: [
      {
        id: 'demo_user_3',
        name: 'Franco Benítez',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        district: 'San Borja, Lima',
        rating: 1780,
        claim: 'Victoria Equipo B (Franco Benítez)'
      }
    ],
    chatMessages: [
      { id: '1', senderName: 'Carlos Mendoza', text: 'Nos vemos 8pm en cancha El Golazo.' },
      { id: '2', senderName: 'Franco Benítez', text: 'Listo, llevo balón número 5.' },
      { id: '3', senderName: 'Carlos Mendoza', text: 'Buen partido, gané 5-4.' },
      { id: '4', senderName: 'Franco Benítez', text: '¿Qué hablas? El último gol fue mío en tiempo añadido. Quedamos 5-3 yo.' }
    ]
  };

  const list = disputedMatches.length > 0 ? disputedMatches : [fallbackDispute];
  const [selectedMatch, setSelectedMatch] = useState(list[0]);
  const [resolvedStatus, setResolvedStatus] = useState(null);

  const handleResolve = (winnerTeam) => {
    if (!selectedMatch) return;

    // Emitir resolución por socket
    adminSocket.emit('reportResult', {
      matchId: selectedMatch.id,
      userId: 'demo_user_admin',
      winnerTeam
    });

    setResolvedStatus(`Disputa resuelta a favor de ${winnerTeam === 'teamA' ? 'Equipo A' : 'Equipo B'}. Puntos asignados (+35 pts).`);
  };

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
