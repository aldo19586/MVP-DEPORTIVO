import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, MapPin, Sparkles, CheckCircle2, Target, Trophy, ArrowLeft, ArrowRight, ShieldCheck, ChevronRight } from 'lucide-react';
import MapZoneModal from './MapZoneModal.jsx';
import PlayerCardFUT from './PlayerCardFUT.jsx';

import ALL_PERU_DISTRICTS from '../data/peru_districts.json';

const AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
];

const DEFAULT_DISTRICT = 'Surco, Lima';


const AVAILABLE_SPORTS = [
  { id: 'futbol', name: 'Fútbol / Fulbito', icon: '⚽' },
  { id: 'padel', name: 'Pádel', icon: '🎾' },
  { id: 'basquet', name: 'Básquetbol', icon: '🏀' },
  { id: 'tenis', name: 'Tenis', icon: '🎾' }
];

const SPORT_POSITIONS = {
  futbol: [
    { id: 'DEL', name: 'DEL - Delantero (Goleador)' },
    { id: 'MED', name: 'MED - Volante (Armador)' },
    { id: 'DEF', name: 'DEF - Defensa (Muralla)' },
    { id: 'POR', name: 'POR - Arquero (Cerrojo)' }
  ],
  padel: [
    { id: 'DRIVE', name: 'DRIVE - Jugador de Derecha' },
    { id: 'REVES', name: 'REVÉS - Jugador de Revés (Definidor)' }
  ],
  basquet: [
    { id: 'BASE', name: 'BASE - Armador (Playmaker)' },
    { id: 'ALERO', name: 'ALERO - Perímetro y Penetración' },
    { id: 'PIVOT', name: 'PÍVOT - Centro y Rebotes' }
  ],
  tenis: [
    { id: 'FONDO', name: 'FONDO - Peloteo de Fondo' },
    { id: 'RED', name: 'VOLEA - Saque y Red' },
    { id: 'POLIV', name: 'POLIVALENTE - Todo Terreno' }
  ]
};

const SPORT_TEST_QUESTIONS = {
  futbol: [
    {
      id: 'q1',
      question: '1. ¿Con qué frecuencia juegas pichangas o fútbol al mes?',
      options: [
        { text: '1 o 2 veces al mes (Casual / Recreativo)', score: 10, level: 'Principiante' },
        { text: '1 o 2 veces por semana (Regular / Buen ritmo)', score: 25, level: 'Intermedio' },
        { text: '3 o más veces por semana (Intenso / Torneos)', score: 40, level: 'Avanzado' }
      ]
    },
    {
      id: 'q2',
      question: '2. ¿Cuál es tu fortaleza en la cancha?',
      options: [
        { text: 'Juego limpio y ganas de divertirme', score: 10, level: 'Principiante' },
        { text: 'Pase seguro y buen posicionamiento táctico', score: 25, level: 'Intermedio' },
        { text: 'Definición letal, gambeta 1v1 y pegada potente', score: 40, level: 'Avanzado' }
      ]
    },
    {
      id: 'q3',
      question: '3. ¿En qué nivel compites habitualmente?',
      options: [
        { text: 'Pichangas entre amigos sin presión', score: 10, level: 'Principiante' },
        { text: 'Retos de canchas sintéticas o torneos distritales', score: 25, level: 'Intermedio' },
        { text: 'Ligas de alto nivel / Campeonatos oficiales', score: 45, level: 'Competitivo' }
      ]
    }
  ],
  padel: [
    {
      id: 'q1',
      question: '1. ¿Cuál es tu categoría habitual en torneos de Pádel?',
      options: [
        { text: 'Iniciación / 6ta categoría (Aprendiendo giros)', score: 10, level: 'Principiante' },
        { text: '5ta categoría (Buen control de fondo)', score: 25, level: 'Intermedio' },
        { text: '4ta / 3ra categoría (Bandejas y subida a la red)', score: 40, level: 'Avanzado' }
      ]
    },
    {
      id: 'q2',
      question: '2. ¿Cómo manejas el rebote en paredes y cristales?',
      options: [
        { text: 'Se me complica anticipar la bola', score: 10, level: 'Principiante' },
        { text: 'Devuelvo cómodo giros de pared simple', score: 25, level: 'Intermedio' },
        { text: 'Domino doble pared y bajadas de pared con potencia', score: 40, level: 'Avanzado' }
      ]
    },
    {
      id: 'q3',
      question: '3. ¿Frecuencia de partidos al mes?',
      options: [
        { text: '1 o 2 partidos mensuales', score: 10, level: 'Principiante' },
        { text: '1 o 2 partidos por semana', score: 25, level: 'Intermedio' },
        { text: '3 o más veces por semana en clubes', score: 40, level: 'Avanzado' }
      ]
    }
  ],
  basquet: [
    {
      id: 'q1',
      question: '1. ¿Cuál es tu experiencia en básquetbol / streetball?',
      options: [
        { text: 'Tiros libres y juego recreativo en parque', score: 10, level: 'Principiante' },
        { text: 'Partidos de media cancha (3x3) con buen tiro', score: 25, level: 'Intermedio' },
        { text: 'Torneos distritales o ligas FIBA 3x3', score: 40, level: 'Avanzado' }
      ]
    },
    {
      id: 'q2',
      question: '2. ¿Frecuencia de juego al mes?',
      options: [
        { text: '1 a 2 veces al mes', score: 10, level: 'Principiante' },
        { text: '1 a 2 veces por semana', score: 25, level: 'Intermedio' },
        { text: 'Competitivo constante (3+ por semana)', score: 40, level: 'Avanzado' }
      ]
    },
    {
      id: 'q3',
      question: '3. ¿Rol principal?',
      options: [
        { text: 'Pase y defensa', score: 15, level: 'Principiante' },
        { text: 'Tiro de media y penetración', score: 25, level: 'Intermedio' },
        { text: 'Triplero o anotador principal', score: 40, level: 'Avanzado' }
      ]
    }
  ],
  tenis: [
    {
      id: 'q1',
      question: '1. ¿Cuál es tu nivel NTRP aproximado en Tenis?',
      options: [
        { text: 'NTRP 2.0 - 2.5 (Iniciación y peloteo suave)', score: 10, level: 'Principiante' },
        { text: 'NTRP 3.0 - 3.5 (Saque consistente y topspin)', score: 25, level: 'Intermedio' },
        { text: 'NTRP 4.0+ (Golpes con ritmo, profundidad y efecto)', score: 40, level: 'Avanzado' }
      ]
    },
    {
      id: 'q2',
      question: '2. ¿Frecuencia en cancha?',
      options: [
        { text: '1 a 2 veces al mes', score: 10, level: 'Principiante' },
        { text: '1 a 2 veces por semana', score: 25, level: 'Intermedio' },
        { text: '3 o más entrenamientos por semana', score: 40, level: 'Avanzado' }
      ]
    },
    {
      id: 'q3',
      question: '3. ¿Tipo de partidos habituales?',
      options: [
        { text: 'Peloteo amistoso', score: 10, level: 'Principiante' },
        { text: 'Sets con marcador y tie-break', score: 25, level: 'Intermedio' },
        { text: 'Torneos de clubes o federados', score: 40, level: 'Avanzado' }
      ]
    }
  ]
};

export default function AuthModal({ onLogin }) {
  // view: 'choice' (inicio) | 'login' (iniciar sesión) | 'register' (registro paso a paso)
  const [view, setView] = useState('choice');
  const [step, setStep] = useState(1); // 1: Credenciales, 2: Deportes y Posición, 3: Radio/Mapa, 4: Test, 5: Carta FUT

  // Campos de formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);

  // Deportes seleccionados: favorito (principal) + hasta 2 secundarios
  const [primarySport, setPrimarySport] = useState('futbol');
  const [secondarySports, setSecondarySports] = useState(['padel']);
  const [position, setPosition] = useState('DEL');

  // Radio y ubicación
  const [district, setDistrict] = useState(DEFAULT_DISTRICT);
  const [radiusKm, setRadiusKm] = useState(6);
  const [lat, setLat] = useState(-12.137);
  const [lng, setLng] = useState(-76.985);
  const [showMapModal, setShowMapModal] = useState(false);

  // Test deportivo
  const [testAnswers, setTestAnswers] = useState({ q1: 1, q2: 1, q3: 1 });
  const [calculatedLevel, setCalculatedLevel] = useState('Intermedio');
  const [createdUser, setCreatedUser] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cambiar posiciones automáticamente si cambia el deporte principal
  const handleSelectPrimarySport = (sportId) => {
    setPrimarySport(sportId);
    const availablePos = SPORT_POSITIONS[sportId];
    if (availablePos && availablePos.length > 0) {
      setPosition(availablePos[0].id);
    }
    // Reiniciar respuestas de test para nuevo deporte
    setTestAnswers({ q1: 1, q2: 1, q3: 1 });
  };

  const handleToggleSecondarySport = (sportId) => {
    if (sportId === primarySport) return;
    if (secondarySports.includes(sportId)) {
      setSecondarySports(secondarySports.filter((s) => s !== sportId));
    } else {
      if (secondarySports.length < 2) {
        setSecondarySports([...secondarySports, sportId]);
      }
    }
  };

  // INICIAR SESIÓN (LOGIN)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Por favor ingresa un correo válido');
      return;
    }
    if (!password) {
      setError('Por favor ingresa tu contraseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        const fullUser = { ...data.user, lat, lng, radiusKm, district };
        localStorage.setItem('matchsport_location', JSON.stringify({ lat, lng, radiusKm, district }));
        onLogin(fullUser);
      } else {
        setError(data.error || 'Credenciales incorrectas');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // REGISTRO - Paso 1 a Paso 2
  const handleRegisterStep1 = (e) => {
    e?.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Ingresa un correo electrónico válido');
      return;
    }
    if (!password || password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }
    setError('');
    setStep(2);
  };

  // REGISTRO - Paso 2 a Paso 3
  const handleRegisterStep2 = (e) => {
    e?.preventDefault();
    setError('');
    setStep(3);
  };

  // REGISTRO - Paso 3 a Paso 4
  const handleRegisterStep3 = (e) => {
    e?.preventDefault();
    setError('');
    setStep(4);
  };

  // REGISTRO - FINALIZAR TEST (Paso 4 a Paso 5: Revelación con TOPE DE 70)
  const handleFinishRegisterTest = async () => {
    const currentQuestions = SPORT_TEST_QUESTIONS[primarySport] || SPORT_TEST_QUESTIONS.futbol;
    const totalScore =
      (currentQuestions[0]?.options[testAnswers.q1]?.score || 25) +
      (currentQuestions[1]?.options[testAnswers.q2]?.score || 25) +
      (currentQuestions[2]?.options[testAnswers.q3]?.score || 25);

    let level = 'Intermedio';
    if (totalScore >= 110) level = 'Competitivo';
    else if (totalScore >= 80) level = 'Avanzado';
    else if (totalScore <= 45) level = 'Principiante';

    setCalculatedLevel(level);
    setLoading(true);
    setError('');

    const allFavoriteSports = Array.from(new Set([primarySport, ...secondarySports]));

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || email.split('@')[0],
          district,
          avatar,
          favoriteSports: allFavoriteSports,
          primarySport,
          position,
          declaredLevel: level
        })
      });

      const data = await res.json();
      if (res.ok && data.user) {
        const fullUser = {
          ...data.user,
          lat,
          lng,
          radiusKm,
          district,
          favoriteSports: allFavoriteSports,
          primarySport,
          position,
          declaredLevel: level
        };
        setCreatedUser(fullUser);
        localStorage.setItem('matchsport_location', JSON.stringify({ lat, lng, radiusKm, district }));
        setStep(5);
      } else {
        setError(data.error || 'Error al crear cuenta');
      }
    } catch (err) {
      // Fallback con stats iniciales con TOPE MÁXIMO DE 70 para recién registrados
      const baseVal = level === 'Competitivo' ? 68 : level === 'Avanzado' ? 66 : level === 'Principiante' ? 58 : 63;
      const cappedStats = {
        rit: Math.min(70, Math.max(50, baseVal + 2)),
        tir: Math.min(70, Math.max(50, baseVal - 1)),
        pas: Math.min(70, Math.max(50, baseVal + 1)),
        reg: Math.min(70, Math.max(50, baseVal)),
        def: Math.min(70, Math.max(50, baseVal - 4)),
        fis: Math.min(70, Math.max(50, baseVal + 2)),
        ovr: Math.min(70, Math.max(58, baseVal)),
        reviewsCount: 1
      };
      const fallbackUser = {
        id: 'user_local_' + Date.now(),
        email: email.trim(),
        name: name.trim() || email.split('@')[0],
        district,
        radiusKm,
        lat,
        lng,
        avatar,
        favoriteSports: allFavoriteSports,
        primarySport,
        position,
        declaredLevel: level,
        futStats: cappedStats
      };
      setCreatedUser(fallbackUser);
      localStorage.setItem('matchsport_location', JSON.stringify({ lat, lng, radiusKm, district }));
      setStep(5);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterApp = () => {
    if (createdUser) {
      onLogin(createdUser);
    }
  };

  // Botones de demostración rápida para pruebas
  const handleQuickLogin = (testEmail, testName, testDistrict, testAvatar, pos = 'DEL', sport = 'futbol') => {
    setEmail(testEmail);
    setName(testName);
    setDistrict(testDistrict);
    setAvatar(testAvatar);
    setPosition(pos);
    setPrimarySport(sport);
    setPassword('123456');

    // Iniciar de una vez si es prueba
    onLogin({
      id: testEmail.includes('admin') ? 'demo_user_admin' : testEmail.includes('carlos') ? 'demo_user_1' : 'demo_user_3',
      email: testEmail,
      name: testName,
      district: testDistrict,
      avatar: testAvatar,
      position: pos,
      primarySport: sport,
      role: testEmail.includes('admin') ? 'admin' : 'player',
      futStats: { rit: 70, tir: 68, pas: 69, reg: 70, def: 64, fis: 69, ovr: 68 }
    });
  };

  const currentQuestions = SPORT_TEST_QUESTIONS[primarySport] || SPORT_TEST_QUESTIONS.futbol;
  const currentSportObj = AVAILABLE_SPORTS.find((s) => s.id === primarySport) || AVAILABLE_SPORTS[0];

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ padding: '22px 18px 26px', maxWidth: '440px', maxHeight: '92vh', overflowY: 'auto' }}>
        
        {/* ========================================================================= */}
        {/* VISTA 1: PANTALLA INICIAL (ELECCIÓN: INICIAR SESIÓN O REGISTRARME)          */}
        {/* ========================================================================= */}
        {view === 'choice' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.45)',
              marginBottom: '14px'
            }}>
              <Sparkles size={32} color="#ffffff" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                MATCHSPORT
              </h2>
              <span className="brand-tag">DESAFÍO</span>
            </div>

            <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '320px', margin: '0 auto 24px', lineHeight: 1.4 }}>
              Encuentra rivales deportivos, compite en canchas de tu zona y construye tu Carta Oficial FUT.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setView('register');
                  setStep(1);
                }}
                className="btn btn-primary"
                style={{ padding: '14px', fontSize: '15px', fontWeight: 800, gap: '8px' }}
              >
                <span>Crear Cuenta / Registrarme</span>
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setView('login');
                }}
                className="btn btn-secondary"
                style={{ padding: '14px', fontSize: '14px', fontWeight: 700 }}
              >
                Ya tengo una cuenta • Iniciar Sesión
              </button>
            </div>

            {/* Accesos rápidos destacados para pruebas */}
            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                Accesos rápidos de prueba (1 clic):
              </p>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@matchsport.pe', 'Admin MatchSport (Dueño)', 'San Isidro, Lima', AVATARS[2], 'DEL', 'futbol')}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '11px',
                  fontSize: '13px',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  borderColor: '#ef4444',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                  gap: '6px',
                  marginBottom: '8px'
                }}
              >
                👑 Entrar como Administrador / Dueño
              </button>

              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('carlos.crack@deporte.pe', 'Carlos Mendoza', 'Surco, Lima', AVATARS[0], 'DEL', 'futbol')}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '7px 10px', flex: 1 }}
                >
                  ⚡ Carlos (Fútbol)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('mateo.padel@deporte.pe', 'Mateo Ramos', 'Miraflores, Lima', AVATARS[1], 'DRIVE', 'padel')}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '7px 10px', flex: 1 }}
                >
                  🎾 Mateo (Pádel)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VISTA 2: INICIAR SESIÓN                                                   */}
        {/* ========================================================================= */}
        {view === 'login' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setView('choice');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px'
                }}
              >
                <ArrowLeft size={16} />
                <span>Volver</span>
              </button>

              <span style={{ fontSize: '11px', color: '#64748b' }}>Acceso</span>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>
                Iniciar Sesión
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Ingresa con tu correo y contraseña registrados
              </p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#fca5a5',
                marginBottom: '14px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Correo Electrónico
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@gmail.com"
                    required
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '10px 12px 10px 38px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '10px 38px 10px 38px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '12px',
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '12px', fontSize: '14px', fontWeight: 800, marginTop: '6px' }}
              >
                {loading ? 'Verificando...' : 'Entrar a la Cancha'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>¿Aún no tienes cuenta? </span>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setView('register');
                  setStep(1);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#10b981',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Regístrate aquí
              </button>
            </div>

            {/* Accesos rápidos también en Login */}
            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginBottom: '8px' }}>
                O ingresa directamente con un perfil de prueba:
              </p>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@matchsport.pe', 'Admin MatchSport (Dueño)', 'San Isidro, Lima', AVATARS[2], 'DEL', 'futbol')}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '11px',
                  fontSize: '13px',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  borderColor: '#ef4444',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                  gap: '6px',
                  marginBottom: '8px'
                }}
              >
                👑 Entrar como Administrador / Dueño
              </button>

              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('carlos.crack@deporte.pe', 'Carlos Mendoza', 'Surco, Lima', AVATARS[0], 'DEL', 'futbol')}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '7px 10px', flex: 1 }}
                >
                  ⚡ Carlos (Fútbol)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('mateo.padel@deporte.pe', 'Mateo Ramos', 'Miraflores, Lima', AVATARS[1], 'DRIVE', 'padel')}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '7px 10px', flex: 1 }}
                >
                  🎾 Mateo (Pádel)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VISTA 3: REGISTRO PASO A PASO CON BOTÓN VOLVER ATRÁS EN CADA PANTALLA      */}
        {/* ========================================================================= */}
        {view === 'register' && (
          <div>
            {/* Cabecera con botón Volver y Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  if (step === 1) setView('choice');
                  else setStep(step - 1);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px'
                }}
              >
                <ArrowLeft size={16} />
                <span>Volver</span>
              </button>

              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 800 }}>
                Paso {step} de 4
              </span>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#fca5a5',
                marginBottom: '14px'
              }}>
                {error}
              </div>
            )}

            {/* PASO 1: CORREO, CONTRASEÑA, APODO Y AVATAR */}
            {step === 1 && (
              <form onSubmit={handleRegisterStep1} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>
                    1. Tus Datos de Acceso
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Crea tu cuenta para guardar tu ranking y perfil
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Correo Electrónico
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@gmail.com"
                      required
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        padding: '10px 12px 10px 38px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      required
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        padding: '10px 38px 10px 38px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '12px',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Tu Nombre o Apodo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Carlos Mendoza"
                    required
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    Elige tu Avatar
                  </label>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {AVATARS.map((av, idx) => (
                      <img
                        key={idx}
                        src={av}
                        alt="Avatar option"
                        onClick={() => setAvatar(av)}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          border: avatar === av ? '2px solid #10b981' : '2px solid transparent',
                          transform: avatar === av ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all 0.2s',
                          objectFit: 'cover'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '12px', fontSize: '14px', fontWeight: 800, gap: '6px', marginTop: '4px' }}
                >
                  Siguiente: Tus Deportes
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* PASO 2: DEPORTE FAVORITO, OTROS DOS MÁS Y POSICIÓN EN ESE DEPORTE */}
            {step === 2 && (
              <form onSubmit={handleRegisterStep2} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>
                    2. ¿Qué deportes te gusta jugar?
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Elige tu deporte favorito principal y hasta 2 más
                  </p>
                </div>

                {/* Deporte Principal (Favorito) */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#10b981', marginBottom: '6px' }}>
                    ⭐ Tu Deporte Favorito Principal:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {AVAILABLE_SPORTS.map((s) => {
                      const isPrimary = primarySport === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectPrimarySport(s.id)}
                          style={{
                            background: isPrimary ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            border: isPrimary ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            padding: '10px 8px',
                            color: isPrimary ? '#a7f3d0' : '#cbd5e1',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <span>{s.icon}</span>
                          <span>{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Otros 2 deportes secundarios */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                    Otros deportes que también juegas (hasta 2 más):
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {AVAILABLE_SPORTS.filter((s) => s.id !== primarySport).map((s) => {
                      const isSecondary = secondarySports.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleToggleSecondarySport(s.id)}
                          style={{
                            background: isSecondary ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            border: isSecondary ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            color: isSecondary ? '#93c5fd' : '#64748b',
                            fontSize: '11px',
                            fontWeight: isSecondary ? 700 : 500,
                            cursor: 'pointer'
                          }}
                        >
                          {isSecondary ? '✓ ' : '+ '} {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Posición en su deporte favorito */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '12px'
                }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#fcd34d', marginBottom: '6px' }}>
                    📍 Tu Posición o Rol en {currentSportObj.name}:
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  >
                    {(SPORT_POSITIONS[primarySport] || SPORT_POSITIONS.futbol).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '12px', fontSize: '14px', fontWeight: 800, gap: '6px' }}
                >
                  Siguiente: Radio de Búsqueda
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* PASO 3: RADIO DE BÚSQUEDA Y MAPA */}
            {step === 3 && (
              <form onSubmit={handleRegisterStep3} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>
                    3. ¿En qué zona quieres jugar?
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Configura tu radio para encontrar rivales cerca de ti
                  </p>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Target size={16} color="#10b981" />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                        Radio de Búsqueda
                      </span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#10b981' }}>
                      {radiusKm} km a la redonda
                    </span>
                  </div>

                  <input
                    type="range"
                    min="2"
                    max="20"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#10b981', margin: '8px 0 12px' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#cbd5e1' }}>📍 Centro: <strong>{district}</strong></span>
                    <button
                      type="button"
                      onClick={() => setShowMapModal(true)}
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34d399',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >
                      🗺️ Ajustar en Mapa
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '12px', fontSize: '14px', fontWeight: 800, gap: '6px' }}
                >
                  Siguiente: Test de {currentSportObj.name}
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* PASO 4: TEST ESPECÍFICO DEL DEPORTE FAVORITO */}
            {step === 4 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid #3b82f6',
                    marginBottom: '6px'
                  }}>
                    <Trophy size={22} color="#3b82f6" />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>
                    Test de Nivel: {currentSportObj.name}
                  </h3>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Tus respuestas calibrarán tu carta inicial (máx 70 por ser registro inicial)
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentQuestions.map((q) => (
                    <div key={q.id} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '10px 12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#cbd5e1' }}>
                        {q.question}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {q.options.map((opt, optIdx) => {
                          const isSelected = testAnswers[q.id] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => setTestAnswers({ ...testAnswers, [q.id]: optIdx })}
                              style={{
                                background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0,0,0,0.3)',
                                border: isSelected ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                                color: isSelected ? '#a7f3d0' : '#94a3b8',
                                borderRadius: '8px',
                                padding: '8px 10px',
                                textAlign: 'left',
                                fontSize: '11px',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer'
                              }}
                            >
                              {isSelected ? '✓ ' : '○ '} {opt.text}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleFinishRegisterTest}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '16px', padding: '12px', fontSize: '14px', fontWeight: 800 }}
                >
                  {loading ? 'Generando tu Carta FUT inicial...' : 'Generar Mi Carta Deportiva'}
                </button>
              </div>
            )}

            {/* PASO 5: CARTA FUT REVELADA (MÁXIMO 70 POR PRIMERA VEZ) */}
            {step === 5 && createdUser && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid #10b981',
                  borderRadius: '12px',
                  padding: '10px',
                  color: '#6ee7b7',
                  fontSize: '12px',
                  fontWeight: 800,
                  marginBottom: '12px'
                }}>
                  🎉 ¡Felicidades! Nivel {calculatedLevel} asignado. Tu Carta Oficial inicial ha sido creada (máx 70).
                  ¡Sube tus estadísticas ganando duelos y recibiendo votos de tus rivales!
                </div>

                <PlayerCardFUT user={createdUser} sport={primarySport} />

                <button
                  type="button"
                  onClick={handleEnterApp}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 900, marginTop: '12px' }}
                >
                  ⚡ ¡Comenzar a Buscar Partidos!
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal de Mapa Leaflet */}
        {showMapModal && (
          <MapZoneModal
            currentLocation={{ lat, lng, radiusKm, district }}
            onSave={(newLoc) => {
              setLat(newLoc.lat);
              setLng(newLoc.lng);
              setRadiusKm(newLoc.radiusKm);
              setDistrict(newLoc.district);
              setShowMapModal(false);
            }}
            onClose={() => setShowMapModal(false)}
          />
        )}
      </div>
    </div>
  );
}
