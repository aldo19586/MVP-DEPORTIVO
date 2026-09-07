import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, CheckCircle2, AlertTriangle, Users, Trophy, Settings, Activity, X, Save } from 'lucide-react';

export default function AdminDashboard({ sports, onlineUsers = [], onClose }) {
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'metrics' | 'questionnaires' | 'formats' | 'users'
  const [metrics, setMetrics] = useState({
    totalUsers: 4,
    totalMatches: 8,
    activeMatches: 1,
    activeSearches: 0,
    disputes: 0,
    sportsCount: 4
  });

  const [liveActivity, setLiveActivity] = useState({
    onlineCount: onlineUsers.length || 1,
    onlineUsers: onlineUsers,
    activeMatches: []
  });

  const [selectedSport, setSelectedSport] = useState('futbol');
  const [questions, setQuestions] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [sportsList, setSportsList] = useState(sports || []);
  const [saveStatus, setSaveStatus] = useState(null);

  // Cargar actividad en vivo periódicamente
  useEffect(() => {
    const fetchLive = () => {
      fetch('/api/admin/live-activity')
        .then((r) => r.json())
        .then((data) => {
          if (data) setLiveActivity(data);
        })
        .catch(() => {});
    };

    fetchLive();
    const interval = setInterval(fetchLive, 3000);
    return () => clearInterval(interval);
  }, []);

  // Nueva pregunta
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState([
    { text: 'Nivel Recreativo / Básico', score: 10, level: 'Principiante' },
    { text: 'Nivel Intermedio Regular', score: 25, level: 'Intermedio' },
    { text: 'Nivel Avanzado / Competitivo', score: 40, level: 'Avanzado' }
  ]);

  useEffect(() => {
    // Cargar métricas
    fetch('/api/admin/metrics')
      .then((r) => r.json())
      .then((d) => d.metrics && setMetrics(d.metrics))
      .catch(() => {});

    // Cargar usuarios
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => d.users && setUsersList(d.users))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Cargar preguntas del deporte seleccionado
    fetch(`/api/questionnaire/${selectedSport}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.questions) setQuestions(d.questions);
      })
      .catch(() => {});
  }, [selectedSport]);

  const handleSaveQuestionnaire = async () => {
    try {
      const res = await fetch(`/api/admin/questionnaire/${selectedSport}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions })
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('¡Cuestionario guardado con éxito!');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (e) {
      setSaveStatus('Error al guardar cuestionario');
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    const newQ = {
      id: `${selectedSport}_q_${Date.now()}`,
      question: newQuestionText.trim(),
      options: newOptions.filter((o) => o.text.trim().length > 0)
    };
    setQuestions([...questions, newQ]);
    setNewQuestionText('');
  };

  const handleDeleteQuestion = (qId) => {
    setQuestions(questions.filter((q) => q.id !== qId));
  };

  const handleToggleFormat = async (sportId, formatId, currentActive) => {
    try {
      const res = await fetch('/api/admin/sport/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sportId, formatId, active: !currentActive })
      });
      const data = await res.json();
      if (data.success) {
        setSportsList((prev) =>
          prev.map((s) => {
            if (s.id !== sportId) return s;
            return {
              ...s,
              formats: s.formats.map((f) => (f.id === formatId ? { ...f, active: !currentActive } : f))
            };
          })
        );
      }
    } catch (e) {}
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '540px', padding: '20px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header de Administrador */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={22} color="#ef4444" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#fff' }}>
                  Panel de Dueño / Admin
                </h3>
                <span style={{ fontSize: '10px', background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                  ROOT
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                Supervisión en vivo de jugadores, partidas y configuración
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Pestañas del Panel */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '4px',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '16px'
        }}>
          {[
            { id: 'live', label: '🔴 En Vivo', count: liveActivity.onlineUsers?.length || 1 },
            { id: 'metrics', label: 'Métricas' },
            { id: 'questionnaires', label: 'Test Nivel' },
            { id: 'formats', label: 'Formatos' },
            { id: 'users', label: 'Usuarios' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? '#ef4444' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 2px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 800,
                textAlign: 'center',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 0: EN VIVO (ACTIVIDAD EN TIEMPO REAL) */}
        {activeTab === 'live' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto' }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#fca5a5' }}>
                  Monitoreo en Tiempo Real
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#fff', fontWeight: 800 }}>
                {liveActivity.onlineUsers?.length || 1} jugadores conectados
              </span>
            </div>

            {/* Lista de usuarios en vivo y qué están haciendo */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Jugadores en Línea Ahora Mismo
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {(liveActivity.onlineUsers || []).map((u) => {
                  let statusColor = '#10b981';
                  let statusBg = 'rgba(16, 185, 129, 0.15)';
                  let statusIcon = '🟢';

                  if (u.status === 'searching') {
                    statusColor = '#f59e0b';
                    statusBg = 'rgba(245, 158, 11, 0.15)';
                    statusIcon = '🔍';
                  } else if (u.status === 'in_chat') {
                    statusColor = '#3b82f6';
                    statusBg = 'rgba(59, 130, 246, 0.15)';
                    statusIcon = '💬';
                  } else if (u.status === 'in_game') {
                    statusColor = '#a855f7';
                    statusBg = 'rgba(168, 85, 247, 0.15)';
                    statusIcon = '⏱️';
                  }

                  return (
                    <div
                      key={u.userId || u.socketId}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px' }}>
                            👤
                          </div>
                        )}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                              {u.name}
                            </span>
                            {u.role === 'admin' && (
                              <span style={{ fontSize: '9px', background: '#ef4444', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: 800 }}>
                                ADMIN
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {u.district || 'Lima'}
                          </span>
                        </div>
                      </div>

                      {/* Estado en vivo */}
                      <div style={{
                        background: statusBg,
                        border: `1px solid ${statusColor}`,
                        color: statusColor,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textAlign: 'right'
                      }}>
                        <span>{statusIcon} {u.details || 'En línea'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Partidos Activos en Curso */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Partidos en Cancha / Salas Activas ({liveActivity.activeMatches?.length || 0})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {(!liveActivity.activeMatches || liveActivity.activeMatches.length === 0) ? (
                  <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '10px 0' }}>
                    No hay partidos activos en este momento.
                  </p>
                ) : (
                  liveActivity.activeMatches.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '12px',
                        padding: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          {m.sportId?.toUpperCase()} • {m.formatId}
                        </span>
                        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                          {m.matchTimer?.active ? `⏱️ Cancha: ${m.matchTimer.durationMinutes}m` : '💬 En Coordinación'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                        {m.teamA?.map((p) => p.name).join(', ')} <span style={{ color: '#f59e0b' }}>VS</span> {m.teamB?.map((p) => p.name).join(', ')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: MÉTRICAS GENERALES */}
        {activeTab === 'metrics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '14px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Total de Usuarios</span>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#fff', marginTop: '4px' }}>
                  {metrics.totalUsers}
                </div>
                <span style={{ fontSize: '10px', color: '#10b981' }}>✓ 100% Verificados DNI</span>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '14px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Partidos Organizados</span>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
                  {metrics.totalMatches}
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>{metrics.activeMatches} en cancha hoy</span>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '14px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Búsquedas en Radar</span>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#f59e0b', marginTop: '4px' }}>
                  {metrics.activeSearches}
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>Cola de emparejamiento</span>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '14px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Disputas / Alertas</span>
                <div style={{ fontSize: '26px', fontWeight: 900, color: metrics.disputes > 0 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
                  {metrics.disputes}
                </div>
                <span style={{ fontSize: '10px', color: metrics.disputes > 0 ? '#ef4444' : '#10b981' }}>
                  {metrics.disputes > 0 ? 'Requiere tu revisión' : 'Todo en orden'}
                </span>
              </div>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '14px',
              padding: '12px',
              fontSize: '12px',
              color: '#a7f3d0'
            }}>
              💡 <strong>Como Dueño de la App</strong> tienes la facultad de regular los tests iniciales, calibrar puntos otorgados y moderar las cartas FUT.
            </div>
          </div>
        )}

        {/* TAB 2: CUESTIONARIOS CONFIGURABLES POR DEPORTE */}
        {activeTab === 'questionnaires' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
            {/* Selector de Deporte */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {sportsList.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSport(s.id)}
                  style={{
                    background: selectedSport === s.id ? '#ef4444' : 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {s.icon} {s.name}
                </button>
              ))}
            </div>

            {saveStatus && (
              <div style={{ background: '#10b981', color: '#042416', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, textAlign: 'center' }}>
                {saveStatus}
              </div>
            )}

            {/* Lista de Preguntas Actuales */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                      {idx + 1}. {q.question}
                    </span>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                    {q.options?.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: '#94a3b8',
                          background: 'rgba(0,0,0,0.2)',
                          padding: '4px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        <span>• {opt.text}</span>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>+{opt.score} pts ({opt.level})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Agregar Pregunta Nueva */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.2)', borderRadius: '12px', padding: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#cbd5e1' }}>
                ➕ Agregar Pregunta para {selectedSport.toUpperCase()}
              </span>
              <input
                type="text"
                placeholder="Ej: ¿Cuántos goles sueles anotar por partido?"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '8px',
                  color: '#fff',
                  fontSize: '12px',
                  margin: '8px 0'
                }}
              />
              <button
                onClick={handleAddQuestion}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '6px', fontSize: '12px' }}
              >
                Añadir al Cuestionario
              </button>
            </div>

            <button
              onClick={handleSaveQuestionnaire}
              className="btn btn-primary"
              style={{ padding: '12px', gap: '6px', fontWeight: 800, marginTop: '4px' }}
            >
              <Save size={16} />
              Guardar Cuestionario en Servidor
            </button>
          </div>
        )}

        {/* TAB 3: DEPORTES Y FORMATOS */}
        {activeTab === 'formats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Activa o desactiva formatos de juego en tiempo real para tu comunidad deportiva:
            </p>
            {sportsList.map((sport) => (
              <div key={sport.id} style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span>{sport.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{sport.name}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {sport.formats?.map((fmt) => {
                    const isActive = fmt.active !== false;
                    return (
                      <button
                        key={fmt.id}
                        onClick={() => handleToggleFormat(sport.id, fmt.id, isActive)}
                        style={{
                          background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          border: `1px solid ${isActive ? '#10b981' : '#ef4444'}`,
                          color: isActive ? '#34d399' : '#f87171',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {fmt.name} {isActive ? '✓ Activo' : '✕ Pausado'}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: USUARIOS */}
        {activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
            {usersList.map((u) => (
              <div
                key={u.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img
                    src={u.avatar}
                    alt={u.name}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{u.name}</span>
                      {u.role === 'admin' && (
                        <span style={{ fontSize: '9px', background: '#ef4444', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: 800 }}>
                          ADMIN
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{u.email} • {u.district}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#fcd34d' }}>
                    OVR {u.futStats?.ovr || 75}
                  </span>
                  <div style={{ fontSize: '10px', color: '#10b981' }}>
                    👍 {u.likesCount || 0} Likes
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
