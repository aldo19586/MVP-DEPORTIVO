import React, { useState, useEffect } from 'react';
import { Users, Search, Ban, KeyRound, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { fetchAdminUsers, banUser, resetUserPin, toggleUserDni } from '../services/api';

export default function PlayerAuditView() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    fetchAdminUsers().then((res) => {
      if (res.users) setUsers(res.users);
    });
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = districtFilter === 'all' || u.district?.toLowerCase().includes(districtFilter.toLowerCase());
    return matchesSearch && matchesDistrict;
  });

  const handleBan = async (user) => {
    const hours = prompt(`¿Cuántas horas suspender a ${user.name}? (Ej: 24, 72, 720)`, '24');
    if (hours) {
      try {
        const res = await banUser(user.id, Number(hours), 'Infracción al código de conducta deportiva');
        if (res.success) {
          setActionSuccess(`Jugador ${user.name} suspendido por ${hours} horas.`);
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isBanned: true, bannedUntil: res.user.bannedUntil } : u));
          setTimeout(() => setActionSuccess(''), 5000);
        }
      } catch (e) {
        alert('Error al suspender: ' + e.message);
      }
    }
  };

  const handleResetPin = async (user) => {
    if (confirm(`¿Restablecer el PIN de acceso a "1234" para ${user.name}?`)) {
      try {
        const res = await resetUserPin(user.id, '1234');
        if (res.success) {
          setActionSuccess(`PIN de ${user.name} restablecido a "1234" exitosamente.`);
          setTimeout(() => setActionSuccess(''), 5000);
        }
      } catch (e) {
        alert('Error al restablecer PIN: ' + e.message);
      }
    }
  };

  const handleToggleDni = async (user) => {
    try {
      const res = await toggleUserDni(user.id);
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, verifiedDni: res.verifiedDni } : u));
        setActionSuccess(`DNI de ${user.name} marcado como ${res.verifiedDni ? 'Verificado' : 'Pendiente'}.`);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (e) {
      alert('Error al cambiar verificación DNI: ' + e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Auditoría y Gestión de Jugadores</h2>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          Tabla de alta densidad con filtrado por distrito, verificación de identidad DNI y acciones de control arbitral.
        </p>
      </div>

      {actionSuccess && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          fontWeight: '600',
          fontSize: '13px'
        }}>
          ✅ {actionSuccess}
        </div>
      )}

      <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Barra Superior de Búsqueda y Filtros */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o ID de jugador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '10px 14px 10px 38px',
                color: '#f8fafc',
                fontSize: '13px'
              }}
            />
          </div>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            style={{
              backgroundColor: '#090d16',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#f8fafc',
              fontSize: '13px'
            }}
          >
            <option value="all">Todos los distritos</option>
            <option value="Surco">Santiago de Surco</option>
            <option value="Miraflores">Miraflores</option>
            <option value="San Borja">San Borja</option>
            <option value="San Isidro">San Isidro</option>
            <option value="Barranco">Barranco</option>
            <option value="La Molina">La Molina</option>
            <option value="Callao">Callao</option>
          </select>
        </div>

        {/* Tabla Desktop de Alta Densidad */}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Contacto</th>
              <th>Distrito</th>
              <th>Rating Glicko / OVR</th>
              <th>Atributos FUT</th>
              <th>DNI Verificado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt=""
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', color: '#f8fafc' }}>{u.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{u.position || 'DEL'} • {u.role}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '13px', color: '#cbd5e1' }}>{u.email}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {u.id}</div>
                </td>
                <td>{u.district || 'Lima'}</td>
                <td>
                  <div style={{ fontWeight: '800', color: '#10b981', fontSize: '14px' }}>
                    {u.ratingOverall || 1500} pts
                  </div>
                  <div style={{ fontSize: '11px', color: '#06b6d4' }}>
                    OVR: {u.futStats?.ovr || 75}
                  </div>
                </td>
                <td>
                  {u.futStats ? (
                    <div style={{ display: 'flex', gap: '6px', fontSize: '10px', color: '#94a3b8' }}>
                      <span>RIT {u.futStats.rit}</span>
                      <span>TIR {u.futStats.tir}</span>
                      <span>PAS {u.futStats.pas}</span>
                      <span>DEF {u.futStats.def}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Sin evaluar</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span
                      onClick={() => handleToggleDni(u)}
                      className={`badge ${u.verifiedDni ? 'badge-lime' : 'badge-amber'}`}
                      style={{ gap: '4px', cursor: 'pointer' }}
                      title="Haz clic para alternar verificación"
                    >
                      {u.verifiedDni ? <><CheckCircle2 size={12} /> Verificado</> : 'Pendiente'}
                    </span>
                    {u.isBanned && u.bannedUntil > Date.now() && (
                      <span className="badge badge-red" style={{ fontSize: '10px' }}>
                        🚫 Suspendido
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '6px 10px', fontSize: '11px' }}
                      title="Baneo temporal"
                      onClick={() => handleBan(u)}
                    >
                      <Ban size={13} /> Ban
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '6px 10px', fontSize: '11px' }}
                      title="Restablecer PIN"
                      onClick={() => handleResetPin(u)}
                    >
                      <KeyRound size={13} /> PIN
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
