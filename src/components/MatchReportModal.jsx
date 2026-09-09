import React, { useState, useEffect } from 'react';
import { Trophy, Star, ThumbsUp, CheckCircle, AlertCircle, ArrowRight, X, Sparkles, UserCheck, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function MatchReportModal({
  match,
  currentUserId,
  onReportWinner,
  onReportByReporter,
  onSubmitFutReview,
  onSubmitReview,
  onDisputeMatch,
  onClose,
  ratingUpdateInfo
}) {
  const is1v1 = match?.is1v1 || match?.formatId === '1v1' || (match?.teamA?.length === 1 && match?.teamB?.length === 1);
  const isDesignatedReporter = is1v1 && match?.designatedReporter === currentUserId;

  const inTeamA = match?.teamA.some((p) => p.id === currentUserId || p.userId === currentUserId);
  const myTeamKey = inTeamA ? 'teamA' : 'teamB';
  const rivalTeamKey = inTeamA ? 'teamB' : 'teamA';
  const rivalPlayer = inTeamA ? match?.teamB?.[0] : match?.teamA?.[0];
  const rivalName = rivalPlayer?.name || 'Rival';
  const rivalId = rivalPlayer?.userId || rivalPlayer?.id;

  const [hasReportedLocally, setHasReportedLocally] = useState(false);
  const isFinished = match?.status === 'finished' || Boolean(ratingUpdateInfo) || hasReportedLocally;

  // Estados de reporte
  const [waitingReporter, setWaitingReporter] = useState(!isDesignatedReporter && !isFinished);
  const [reviewSent, setReviewSent] = useState(false);
  const [disputeSent, setDisputeSent] = useState(false);

  // Calificaciones FUT para 1v1
  const [rit, setRit] = useState(78);
  const [tir, setTir] = useState(76);
  const [pas, setPas] = useState(80);
  const [reg, setReg] = useState(78);
  const [def, setDef] = useState(70);
  const [fis, setFis] = useState(75);
  const [giveLike, setGiveLike] = useState(true);

  // Calificaciones para >1v1 (Equipos)
  const [punctuality, setPunctuality] = useState(5);
  const [respect, setRespect] = useState(5);
  const [realLevelScore, setRealLevelScore] = useState(5);

  useEffect(() => {
    if (isFinished && ratingUpdateInfo?.won) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  }, [isFinished, ratingUpdateInfo]);

  const handleSendReportByReporter = (winnerKey) => {
    setHasReportedLocally(true);
    if (onReportByReporter) {
      onReportByReporter(winnerKey);
    } else {
      onReportWinner(winnerKey);
    }
  };

  const handleSendFutReview = () => {
    if (onSubmitFutReview && rivalId) {
      onSubmitFutReview({
        matchId: match.id,
        toUserId: rivalId,
        rit,
        tir,
        pas,
        reg,
        def,
        fis,
        giveLike
      });
      setReviewSent(true);
    }
  };

  const handleSendTeamReview = () => {
    if (onSubmitReview && rivalId) {
      onSubmitReview({
        matchId: match.id,
        toUserId: rivalId,
        punctuality,
        respect,
        realLevelScore
      });
      setReviewSent(true);
    }
  };

  const handleDispute = () => {
    if (onDisputeMatch) {
      onDisputeMatch('El rival reportero marcó un resultado diferente al acordado en cancha.');
      setDisputeSent(true);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ padding: '20px', textAlign: 'center', maxWidth: '420px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* FASE 1: MARCAR QUIÉN GANÓ */}
        {!isFinished ? (
          <div>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '2px solid #f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <Trophy size={28} color="#f59e0b" />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>
              Reporte del Partido
            </h3>

            {is1v1 ? (
              isDesignatedReporter ? (
                <div>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid #10b981',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    margin: '12px 0 16px',
                    fontSize: '12px',
                    color: '#a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left'
                  }}>
                    <UserCheck size={20} color="#10b981" style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Eres el Reportero Designado.</strong> Marca el resultado pactado verbalmente en cancha. El ganador sumará <strong>+35 pts directos</strong>.
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      onClick={() => handleSendReportByReporter(myTeamKey)}
                      className="btn btn-primary"
                      style={{ padding: '14px', fontSize: '15px', fontWeight: 800 }}
                    >
                      🏆 Gané Yo (+35 pts)
                    </button>

                    <button
                      onClick={() => handleSendReportByReporter(rivalTeamKey)}
                      className="btn btn-secondary"
                      style={{ padding: '14px', fontSize: '15px' }}
                    >
                      🤝 Ganó {rivalName} (+35 pts)
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px 0' }}>
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '14px',
                    padding: '16px',
                    fontSize: '13px',
                    color: '#93c5fd',
                    marginBottom: '16px'
                  }}>
                    <p style={{ fontWeight: 700, marginBottom: '6px' }}>
                      👤 Reportero Oficial: {match?.designatedReporterName || 'El rival'}
                    </p>
                    <p style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      Esperando que marque el resultado acordado en cancha. Una vez marcado, se actualizarán tus puntos (+35 pts al ganador).
                    </p>
                  </div>

                  <button
                    onClick={handleDispute}
                    className="btn btn-secondary"
                    disabled={disputeSent}
                    style={{ fontSize: '11px', padding: '8px 12px', borderColor: '#ef4444', color: '#f87171' }}
                  >
                    <ShieldAlert size={14} />
                    {disputeSent ? 'Disputa Enviada al Admin' : '¿No coinciden? Abrir Disputa'}
                  </button>
                </div>
              )
            ) : (
              /* En equipos (>1v1) reporte por consenso */
              <div>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', marginBottom: '16px' }}>
                  Reporta el resultado de tu equipo:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => onReportWinner(myTeamKey)}
                    className="btn btn-primary"
                    style={{ padding: '14px', fontSize: '15px' }}
                  >
                    🏆 Ganó Mi Equipo
                  </button>
                  <button
                    onClick={() => onReportWinner(rivalTeamKey)}
                    className="btn btn-secondary"
                    style={{ padding: '14px', fontSize: '15px' }}
                  >
                    🤝 Ganó el Equipo Rival
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* FASE 2: RESULTADO FINAL Y CALIFICACIÓN */
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>
              {ratingUpdateInfo?.won ? '¡Victoria Registrada!' : 'Partido Finalizado'}
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
              Resultado oficial registrado en la tabla de clasificación.
            </p>

            {/* Tarjeta de Delta de Rating con Tipografía Armoniosa */}
            <div style={{
              background: ratingUpdateInfo?.won ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${ratingUpdateInfo?.won ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tu Ranking en Modo {match?.formatId?.toUpperCase() || '1V1'}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '6px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#94a3b8', fontFamily: 'Outfit' }}>
                  {ratingUpdateInfo?.oldRating || 1400}
                </span>
                <ArrowRight size={15} color="#64748b" />
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', fontFamily: 'Outfit' }}>
                  {ratingUpdateInfo?.newRating || 1435} pts
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: ratingUpdateInfo?.ratingChange >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: ratingUpdateInfo?.ratingChange >= 0 ? '#34d399' : '#f87171'
                }}>
                  {ratingUpdateInfo?.ratingChange >= 0 ? `+${ratingUpdateInfo?.ratingChange} pts` : `${ratingUpdateInfo?.ratingChange} pts`}
                </span>
              </div>
            </div>

            {/* SECCIÓN POST-MATCH SEGÚN FORMATO */}
            {is1v1 ? (
              /* CALIFICACIÓN DE ATRIBUTOS DEL RIVAL */
              !reviewSent ? (
                <div style={{
                  textAlign: 'left',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '14px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                  <div style={{ marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#fff', margin: 0 }}>
                      Calificar Desempeño: {rivalName}
                    </h4>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>
                      Ajusta los atributos deportivos observados en cancha:
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', marginBottom: '2px' }}>
                        <span>Ritmo (RIT):</span>
                        <strong style={{ color: '#34d399' }}>{rit}</strong>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="99"
                        value={rit}
                        onChange={(e) => setRit(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#10b981' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', marginBottom: '2px' }}>
                        <span>Regate (REG):</span>
                        <strong style={{ color: '#34d399' }}>{reg}</strong>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="99"
                        value={reg}
                        onChange={(e) => setReg(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#10b981' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', marginBottom: '2px' }}>
                        <span>Tiro (TIR):</span>
                        <strong style={{ color: '#34d399' }}>{tir}</strong>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="99"
                        value={tir}
                        onChange={(e) => setTir(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#10b981' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', marginBottom: '2px' }}>
                        <span>Defensa (DEF):</span>
                        <strong style={{ color: '#34d399' }}>{def}</strong>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="99"
                        value={def}
                        onChange={(e) => setDef(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#10b981' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', marginBottom: '2px' }}>
                        <span>Pase (PAS):</span>
                        <strong style={{ color: '#34d399' }}>{pas}</strong>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="99"
                        value={pas}
                        onChange={(e) => setPas(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#10b981' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', marginBottom: '2px' }}>
                        <span>Físico (FÍS):</span>
                        <strong style={{ color: '#34d399' }}>{fis}</strong>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="99"
                        value={fis}
                        onChange={(e) => setFis(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#10b981' }}
                      />
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '12px',
                    padding: '8px 10px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: '8px',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Reconocimiento deportivo</span>
                    <button
                      type="button"
                      onClick={() => setGiveLike(!giveLike)}
                      style={{
                        background: giveLike ? '#10b981' : 'rgba(255,255,255,0.06)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        color: giveLike ? '#042416' : '#94a3b8',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {giveLike ? '✓ Like dado' : '+1 Like'}
                    </button>
                  </div>

                  <button
                    onClick={handleSendFutReview}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '12px', padding: '10px', fontSize: '12px', fontWeight: 800 }}
                  >
                    Guardar Calificación
                  </button>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid #10b981',
                  borderRadius: '12px',
                  padding: '10px',
                  color: '#6ee7b7',
                  fontSize: '12px'
                }}>
                  ✓ Calificación guardada exitosamente.
                </div>
              )
            ) : (
              /* CALIFICACIÓN DE EQUIPOS (>1v1): Fair Play general */
              !reviewSent ? (
                <div style={{ textAlign: 'left', background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                    ⭐ Espíritu Deportivo del Equipo Rival
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#cbd5e1' }}>Fair Play y Respeto:</span>
                      <select
                        value={respect}
                        onChange={(e) => setRespect(Number(e.target.value))}
                        style={{ background: '#1e293b', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '4px 8px' }}
                      >
                        <option value="5">⭐⭐⭐⭐⭐ Excelente respeto</option>
                        <option value="4">⭐⭐⭐⭐ Buen juego</option>
                        <option value="1">⭐ Antideportivo / Faltas</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#cbd5e1' }}>Puntualidad de llegada:</span>
                      <select
                        value={punctuality}
                        onChange={(e) => setPunctuality(Number(e.target.value))}
                        style={{ background: '#1e293b', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '4px 8px' }}
                      >
                        <option value="5">A tiempo en cancha</option>
                        <option value="3">10 min de retraso</option>
                        <option value="1">Tarde / No completaron</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSendTeamReview}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: '12px', fontSize: '12px', padding: '8px' }}
                  >
                    Enviar Calificación de Equipo
                  </button>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid #10b981',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#6ee7b7',
                  fontSize: '12px'
                }}>
                  ✓ ¡Calificación de equipo guardada!
                </div>
              )
            )}

            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '14px', padding: '10px', fontSize: '13px', borderRadius: '10px' }}
            >
              Volver al Radar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
