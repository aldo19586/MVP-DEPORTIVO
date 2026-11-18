import React, { useState, useEffect } from 'react';
import { Users, Search, Ban, KeyRound, CheckCircle2, XCircle, ShieldCheck, RotateCcw, AlertCircle } from 'lucide-react';
import { fetchAdminUsers, banUser, unbanUser, resetUserPin, toggleUserDni } from '../services/api';

export default function PlayerAuditView() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let mounted = true;
    setLoadError('');
    fetchAdminUsers().then((res) => {
      if (mounted && res.users) setUsers(res.users);
    }).catch(error => { if (mounted) setLoadError(error.message || 'Error al conectar con el servidor.'); });
    return () => { mounted = false; };
  }, [attempt]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = districtFilter === 'all' || u.district?.toLowerCase().includes(districtFilter.toLowerCase());
    return matchesSearch && matchesDistrict;
  });

  const handleBan = async (user) => {
    const hours = prompt(`¿Cuántas horas suspender a ${user.name}? (Ej: 24, 72, 720)`, '24');
    if (!hours || isNaN(Number(hours)) || Number(hours) <= 0) return;

    const reason = prompt(`Motivo formal de la sanción arbitral para ${user.name}:`, 'Infracción al código de conducta deportiva');
    if (!reason || !reason.trim()) return;

    try {
      const res = await banUser(user.id, Number(hours), reason.trim());
      if (res.success) {
        setActionSuccess(`Jugador ${user.name} suspendido por ${hours} horas. Motivo: "${reason.trim()}".`);
        setActionError('');
        setUsers(prev => prev.map(u => u.id === user.id ? {
          ...u,
          isBanned: true,
          bannedUntil: res.user.bannedUntil,
          banReason: res.user.banReason,
          bannedBy: res.user.bannedBy,
          bannedAt: res.user.bannedAt,
          bannedHours: res.user.bannedHours
        } : u));
        setTimeout(() => setActionSuccess(''), 6000);
      }
    } catch (e) {
      setActionError('Error al suspender: ' + (e.message || 'Error desconocido'));
      setTimeout(() => setActionError(''), 6000);
    }
  };

  const handleUnban = async (user) => {
    if (!confirm(`¿Levantar la suspensión arbitral inmediatamente para ${user.name}?`)) return;
    const reason = prompt(`Motivo del levantamiento de sanción:`, 'Suspensión levantada por SuperAdmin tras revisión');
    if (!reason || !reason.trim()) return;

    try {
      const res = await unbanUser(user.id, reason.trim());
      if (res.success) {
        setActionSuccess(`Suspensión de ${user.name} levantada exitosamente.`);
        setActionError('');
        setUsers(prev => prev.map(u => u.id === user.id ? {
          ...u,
          isBanned: false,
          bannedUntil: 0,
          unbannedBy: res.user.unbannedBy,
          unbannedAt: res.user.unbannedAt,
          unbanReason: res.user.unbanReason
        } : u));
        setTimeout(() => setActionSuccess(''), 6000);
      }
    } catch (e) {
      setActionError('Error al levantar sanción: ' + (e.message || 'Error desconocido'));
      setTimeout(() => setActionError(''), 6000);
    }
  };

  const handleResetPin = async (user) => {
    const reason = prompt(`¿Motivo del restablecimiento de PIN para ${user.name}?`, 'Recuperación acordada de acceso del jugador');
    if (!reason || !reason.trim()) return;

    const newPin = prompt(`Nuevo PIN de 4 dígitos para ${user.name}:`, '1234');
    if (!newPin || !/^\d{4}$/.test(newPin.trim())) {
      alert('El PIN debe tener exactamente 4 dígitos numéricos.');
      return;
    }

    try {
      const res = await resetUserPin(user.id, newPin.trim(), reason.trim());
      if (res.success) {
        setActionSuccess(`PIN de ${user.name} restablecido a "${newPin.trim()}" exitosamente. Motivo: "${reason.trim()}".`);
        setActionError('');
        setUsers(prev => prev.map(u => u.id === user.id ? {
          ...u,
          pinResetBy: res.user.pinResetBy,
          pinResetAt: res.user.pinResetAt,
          pinResetReason: res.user.pinResetReason
        } : u));
        setTimeout(() => setActionSuccess(''), 6000);
      }
    } catch (e) {
      setActionError('Error al restablecer PIN: ' + (e.message || 'Error desconocido'));
      setTimeout(() => setActionError(''), 6000);
    }
  };

  const handleToggleDni = async (user) => {
    try {
      const res = await toggleUserDni(user.id);
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, verifiedDni: res.verifiedDni } : u));
        setActionSuccess(`DNI de ${user.name} marcado como ${res.verifiedDni ? 'Verificado' : 'Pendiente'}.`);
        setActionError('');
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (e) {
      setActionError('Error al cambiar verificación DNI: ' + (e.message || 'Error desconocido'));
      setTimeout(() => setActionError(''), 6000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {loadError && (
        <div role="alert" style={{
          padding: '14px 18px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="#ef4444" />
            <span><strong>Fallo al consultar jugadores:</strong> {loadError}</span>
          </div>
          <button
            onClick={() => setAttempt(value => value + 1)}
            style={{
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: '700'
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Auditoría y Gestión de Jugadores</h2>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          Trazabilidad completa con registro de actor, motivo y fecha en sanciones arbitrales, restablecimiento seguro de PIN y verificación DNI.
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

      {actionError && (
        <div role="alert" style={{
          padding: '12px 18px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#fca5a5',
          fontWeight: '600',
          fontSize: '13px'
        }}>
          ⚠️ {actionError}
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
              <th>Estado & Trazabilidad</th>
              <th>DNI Verificado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  {loadError ? 'No se pudieron cargar los datos debido a un error de conexión.' : 'No se encontraron jugadores registrados con los filtros aplicados.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isCurrentlyBanned = u.isBanned && u.bannedUntil > Date.now();

                return (
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '800', color: '#10b981', fontSize: '13px' }}>
                            {u.ratingOverall || 1500} pts
                          </span>
                          <span style={{ fontSize: '11px', color: '#06b6d4', fontWeight: '700' }}>
                            OVR {u.futStats?.ovr || 75}
                          </span>
                        </div>
                        {u.hasCompletedTest ? (
                          <span className="badge badge-cyan" style={{ fontSize: '10px', width: 'fit-content' }}>
                            📝 Test: {u.testScore} pts ({u.testLevel})
                          </span>
                        ) : (
                          <span className="badge badge-slate" style={{ fontSize: '10px', width: 'fit-content', color: '#94a3b8' }}>
                            ⚠️ Test pendiente
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {isCurrentlyBanned ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="badge badge-red" style={{ fontSize: '10px', width: 'fit-content' }}>
                              🚫 Sancionado hasta {new Date(u.bannedUntil).toLocaleDateString()}
                            </span>
                            <span style={{ fontSize: '10px', color: '#f87171' }}>
                              Motivo: {u.banReason || 'Sanción arbitral'}
                            </span>
                            <span style={{ fontSize: '9px', color: '#64748b' }}>
                              Por: {u.bannedBy || 'SuperAdmin'} el {u.bannedAt ? new Date(u.bannedAt).toLocaleDateString() : 'reciente'}
                            </span>
                          </div>
                        ) : (
                          <span className="badge badge-lime" style={{ fontSize: '10px', width: 'fit-content' }}>
                            ✓ Cuenta Activa
                          </span>
                        )}

                        {u.pinResetAt && (
                          <div style={{ marginTop: '2px', fontSize: '10px', color: '#94a3b8' }}>
                            🔑 PIN reset el {new Date(u.pinResetAt).toLocaleDateString()} por {u.pinResetBy || 'Admin'}
                          </div>
                        )}
                      </div>
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
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {isCurrentlyBanned ? (
                          <button
                            className="btn btn-outline"
                            style={{ padding: '6px 10px', fontSize: '11px', borderColor: '#10b981', color: '#34d399' }}
                            title="Levantar sanción y permitir ingreso"
                            onClick={() => handleUnban(u)}
                          >
                            <RotateCcw size={13} /> Desuspender
                          </button>
                        ) : (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 10px', fontSize: '11px' }}
                            title="Baneo temporal motivado"
                            onClick={() => handleBan(u)}
                          >
                            <Ban size={13} /> Ban
                          </button>
                        )}
                        <button
                          className="btn btn-outline"
                          style={{ padding: '6px 10px', fontSize: '11px' }}
                          title="Restablecer PIN de acceso con motivo"
                          onClick={() => handleResetPin(u)}
                        >
                          <KeyRound size={13} /> Reset PIN
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
