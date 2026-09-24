import React, { useState } from 'react';
import { Users, Radio, MapPin, Clock, Search, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function LiveMonitorView({ onlineUsers = [], activeMatches = [] }) {
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredUsers = onlineUsers.filter((u) => {
    const matchesSearch = u.name?.toLowerCase().includes(filterQuery.toLowerCase()) ||
                          u.district?.toLowerCase().includes(filterQuery.toLowerCase()) ||
                          u.userId?.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'searching':
        return <span className="badge badge-purple">Buscando Radar</span>;
      case 'in_game':
        return <span className="badge badge-lime">En Cancha</span>;
      case 'in_chat':
        return <span className="badge badge-cyan">En Sala/Chat</span>;
      case 'reconnecting':
        return <span className="badge badge-amber">Reconectando</span>;
      default:
        return <span className="badge badge-lime">En Línea (Idle)</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Live Socket Monitor (Tiempo Real)</h2>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          Supervisión directa de sockets activos en el servidor Node.js y partidos jugándose en canchas de Lima.
        </p>
      </div>

      {/* Two Column Layout (1080p high density) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', height: 'calc(100vh - 210px)' }}>
        
        {/* Columna Izquierda: Lista de Usuarios Conectados */}
        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#06b6d4" />
              <h3 style={{ fontSize: '15px' }}>Usuarios Conectados ({onlineUsers.length})</h3>
            </div>
            
            {/* Filtros */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Buscar jugador o distrito..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  style={{
                    backgroundColor: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '6px 12px 6px 30px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    width: '200px'
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  backgroundColor: '#090d16',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#f8fafc',
                  fontSize: '12px'
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="idle">En Línea</option>
                <option value="searching">En Radar</option>
                <option value="in_game">En Cancha</option>
                <option value="in_chat">En Chat</option>
              </select>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th>Distrito</th>
                  <th>Estado Socket</th>
                  <th>Detalle Actividad</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                      No hay usuarios con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.userId || u.socketId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt=""
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: '700', color: '#f8fafc' }}>{u.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{u.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                          <MapPin size={13} color="#64748b" />
                          <span>{u.district || 'Lima'}</span>
                        </div>
                      </td>
                      <td>{getStatusBadge(u.status)}</td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{u.details || 'Conectado'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Columna Derecha: Partidos Activos en Cancha */}
        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Radio size={18} color="#10b981" />
            <h3 style={{ fontSize: '15px' }}>Partidos Activos en Cancha ({activeMatches.length})</h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeMatches.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '48px 20px' }}>
                <CheckCircle2 size={36} color="#334155" style={{ margin: '0 auto 12px auto' }} />
                <p>No hay partidos activos en este momento.</p>
                <span style={{ fontSize: '12px' }}>Los partidos creados desde el Radar aparecerán aquí en vivo.</span>
              </div>
            ) : (
              activeMatches.map((m) => (
                <div
                  key={m.id}
                  style={{
                    backgroundColor: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    padding: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span className="badge badge-lime">{m.sportId?.toUpperCase()} • {m.formatId}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>#{m.id}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#06b6d4' }}>Equipo A</div>
                      <div style={{ fontSize: '13px', color: '#f8fafc' }}>{m.teamA?.[0]?.name || 'Capitán A'}</div>
                    </div>
                    <div style={{ fontWeight: '900', color: '#64748b', fontSize: '14px' }}>VS</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#f59e0b' }}>Equipo B</div>
                      <div style={{ fontSize: '13px', color: '#f8fafc' }}>{m.teamB?.[0]?.name || 'Capitán B'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '11px', color: '#94a3b8' }}>
                    <span>📍 {m.venueDistrict || 'Surco, Lima'}</span>
                    <span>⏱️ Cancha: {m.matchTimer?.active ? 'En marcha' : 'En espera'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
