import React from 'react';
import { Shield, Zap, Target, Award, Share2, Sparkles } from 'lucide-react';

export default function PlayerCardFUT({ user, sport = 'futbol', onClose }) {
  if (!user) return null;

  const stats = user.futStats || {
    rit: 78,
    tir: 75,
    pas: 79,
    reg: 82,
    def: 65,
    fis: 76,
    ovr: 78
  };

  const ovr = stats.ovr || 78;
  const position = user.position || 'DEL';
  const district = user.district || 'Lima';

  // Determinar el tier de la carta según OVR / Rating
  let tierClass = 'card-tier-gold';
  let tierName = 'ORO';
  let tierBadgeBg = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';

  if (ovr >= 91) {
    tierClass = 'card-tier-totw';
    tierName = 'IN-FORM TOTW';
    tierBadgeBg = 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)';
  } else if (ovr >= 83) {
    tierClass = 'card-tier-gold';
    tierName = 'ORO AVANZADO';
    tierBadgeBg = 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)';
  } else if (ovr >= 73) {
    tierClass = 'card-tier-silver';
    tierName = 'PLATA INTERMEDIO';
    tierBadgeBg = 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)';
  } else {
    tierClass = 'card-tier-bronze';
    tierName = 'BRONCE';
    tierBadgeBg = 'linear-gradient(135deg, #b45309 0%, #78350f 100%)';
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Carta FUT de ${user.name}`,
        text: `¡Mira mi Carta Oficial de MatchSport! OVR ${ovr} (${position}) en Lima. ¡Rétame en la cancha!`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`¡Mira mi Carta Oficial de MatchSport! OVR ${ovr} - ${user.name}`);
      alert('¡Enlace de tu carta copiado al portapapeles!');
    }
  };

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px'
    }}>
      {/* Carta estilo Ultimate Team */}
      <div className={`fut-card ${tierClass}`} style={{
        width: '310px',
        minHeight: '440px',
        borderRadius: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: ovr >= 91 
          ? '0 20px 45px -10px rgba(99, 102, 241, 0.5), 0 0 25px rgba(236, 72, 153, 0.3)' 
          : '0 20px 40px -10px rgba(0,0,0,0.7), 0 0 20px rgba(245, 158, 11, 0.25)',
        border: ovr >= 91 ? '2px solid #a855f7' : '2px solid rgba(255, 215, 0, 0.4)',
        background: ovr >= 91 
          ? 'linear-gradient(160deg, #090a0f 0%, #17153b 40%, #2e073f 100%)' 
          : 'linear-gradient(160deg, #1e1b18 0%, #292013 40%, #151009 100%)',
        color: '#fff',
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Efecto de brillo holográfico superior */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '140px',
          background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Header de la Carta: OVR, POS, Bandera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{
              fontSize: '44px',
              fontWeight: 900,
              lineHeight: 0.9,
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-1px',
              color: ovr >= 91 ? '#f472b6' : '#fcd34d',
              textShadow: '0 2px 10px rgba(0,0,0,0.8)'
            }}>
              {ovr}
            </span>
            <span style={{
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '1px',
              color: '#e2e8f0',
              marginTop: '4px'
            }}>
              {position}
            </span>
            <div style={{
              marginTop: '6px',
              fontSize: '11px',
              background: 'rgba(0,0,0,0.5)',
              padding: '2px 6px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              fontWeight: 700
            }}>
              🇵🇪 PE
            </div>
          </div>

          {/* Avatar del Jugador con Efecto Cutout */}
          <div style={{ position: 'relative', marginTop: '-4px' }}>
            <div style={{
              width: '135px',
              height: '135px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: ovr >= 91 ? '3px solid #c084fc' : '3px solid #fbbf24',
              boxShadow: '0 8px 25px rgba(0,0,0,0.6)',
              background: '#0f172a'
            }}>
              <img
                src={user.avatar}
                alt={user.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {ovr >= 91 && (
              <div style={{
                position: 'absolute',
                bottom: '-6px',
                right: '10px',
                background: '#a855f7',
                borderRadius: '50%',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={14} color="#fff" />
              </div>
            )}
          </div>
        </div>

        {/* Nombre del Jugador */}
        <div style={{ textAlign: 'center', marginTop: '14px', zIndex: 2 }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)'
          }}>
            {user.name}
          </h3>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '2px',
            fontSize: '11px',
            color: '#94a3b8',
            fontWeight: 600
          }}>
            <span>📍 {district}</span>
            <span>•</span>
            <span style={{ color: '#10b981' }}>{tierName}</span>
          </div>
        </div>

        {/* Línea Divisoria Decorativa */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
          margin: '12px 0 10px'
        }} />

        {/* Las 6 Estadísticas Oficiales FIFA / FUT */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '18px',
          rowGap: '8px',
          padding: '4px 10px',
          zIndex: 2
        }}>
          {/* Columna Izquierda */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#fcd34d', fontFamily: 'Outfit' }}>
              {stats.rit}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.5px' }}>
              ⚡ RIT
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#fcd34d', fontFamily: 'Outfit' }}>
              {stats.reg}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.5px' }}>
              🪄 REG
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#fcd34d', fontFamily: 'Outfit' }}>
              {stats.tir}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.5px' }}>
              ⚽ TIR
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#fcd34d', fontFamily: 'Outfit' }}>
              {stats.def}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.5px' }}>
              🛡️ DEF
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#fcd34d', fontFamily: 'Outfit' }}>
              {stats.pas}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.5px' }}>
              🎯 PAS
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#fcd34d', fontFamily: 'Outfit' }}>
              {stats.fis}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.5px' }}>
              💪 FÍS
            </span>
          </div>
        </div>

        {/* Footer de la Carta: Sello Oficial */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '9px',
          color: '#64748b',
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}>
          <span>MATCHSPORT • FUT CARD</span>
          <span>{stats.reviewsCount || 1} VOTOS DE RIVALES</span>
        </div>
      </div>

      {/* Botón de Compartir en WhatsApp / Instagram */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', width: '310px' }}>
        <button
          onClick={handleShare}
          className="btn btn-primary"
          style={{ flex: 1, padding: '10px', fontSize: '13px', gap: '6px' }}
        >
          <Share2 size={16} />
          Compartir Carta FUT
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '10px 16px', fontSize: '13px' }}
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
}
