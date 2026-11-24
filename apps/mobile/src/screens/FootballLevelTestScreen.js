import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { THEME } from '../theme';

const COMMON_QUESTIONS = [
  // FÍSICO (20%)
  {
    category: 'FÍSICO',
    title: 'P1. Velocidad en Carrera',
    context: 'Piensa en una carrera de unos 30 metros en cancha:',
    options: [
      { letter: 'A', text: 'Casi siempre me alcanzan o llego de los últimos', tier: 'Tier Bronce • OVR Est. 55 - 65', icon: '🏃' },
      { letter: 'B', text: 'Soy más lento que la mayoría de mi grupo', tier: 'Tier Plata • OVR Est. 66 - 74', icon: '⚡' },
      { letter: 'C', text: 'Estoy en el promedio de mi grupo', tier: 'Tier Oro • OVR Est. 75 - 84', icon: '⭐', recommended: true },
      { letter: 'D', text: 'Soy de los más rápidos de mi grupo', tier: 'Tier Oro Pro • OVR Est. 80 - 84', icon: '🔥' },
      { letter: 'E', text: 'Rara vez alguien me gana en velocidad, incluso en ligas', tier: 'Tier Élite • OVR Est. 85+', icon: '💎' }
    ]
  },
  {
    category: 'FÍSICO',
    title: 'P2. Resistencia Aeróbica',
    context: '¿Cómo llegas físicamente al final de un partido de 60 minutos?',
    options: [
      { letter: 'A', text: 'Me canso a los 15 o 20 minutos de juego', tier: 'Tier Bronce • OVR Est. 55 - 65', icon: '🏃' },
      { letter: 'B', text: 'Aguanto media hora y luego camino bastante', tier: 'Tier Plata • OVR Est. 66 - 74', icon: '⚡' },
      { letter: 'C', text: 'Llego bien, aunque bajo el ritmo al final', tier: 'Tier Oro • OVR Est. 75 - 84', icon: '⭐', recommended: true },
      { letter: 'D', text: 'Llego bien y puedo repetir esfuerzos hasta el final', tier: 'Tier Oro Pro • OVR Est. 80 - 84', icon: '🔥' },
      { letter: 'E', text: 'Corro todo el partido a intensidad alta sin problema', tier: 'Tier Élite • OVR Est. 85+', icon: '💎' }
    ]
  },
  {
    category: 'FÍSICO',
    title: 'P3. Duelos y Contacto Físico',
    context: 'En choques hombro con hombro y balones divididos:',
    options: [
      { letter: 'A', text: 'Evito los choques, me sacan del balón fácilmente', tier: 'Tier Bronce • OVR Est. 55 - 65', icon: '🏃' },
      { letter: 'B', text: 'Pierdo casi todos los duelos físicos', tier: 'Tier Plata • OVR Est. 66 - 74', icon: '⚡' },
      { letter: 'C', text: 'Gano la mitad de los duelos', tier: 'Tier Oro • OVR Est. 75 - 84', icon: '⭐', recommended: true },
      { letter: 'D', text: 'Protejo bien el balón y gano la mayoría', tier: 'Tier Oro Pro • OVR Est. 80 - 84', icon: '🔥' },
      { letter: 'E', text: 'Domino los duelos, cuesta mucho que me muevan', tier: 'Tier Élite • OVR Est. 85+', icon: '💎' }
    ]
  },

  // TÉCNICA (25%)
  {
    category: 'TÉCNICA',
    title: 'P4. Control y Recepción',
    context: 'Te llega un pase fuerte y a media altura:',
    options: [
      { letter: 'A', text: 'Se me escapa casi siempre', tier: 'Tier Bronce • OVR Est. 55 - 65', icon: '⚽' },
      { letter: 'B', text: 'Lo paro, pero necesito varios toques', tier: 'Tier Plata • OVR Est. 66 - 74', icon: '🎯' },
      { letter: 'C', text: 'Lo controlo bien si no tengo rival cerca', tier: 'Tier Oro • OVR Est. 75 - 84', icon: '⭐', recommended: true },
      { letter: 'D', text: 'Lo controlo y ya lo dejo orientado hacia donde voy', tier: 'Tier Oro Pro • OVR Est. 80 - 84', icon: '🔥' },
      { letter: 'E', text: 'Lo controlo bien con cualquier superficie, incluso presionado', tier: 'Tier Élite • OVR Est. 85+', icon: '💎' }
    ]
  },
  {
    category: 'TÉCNICA',
    title: 'P5. Precisión de Pase',
    context: 'Pases de unos 20 metros a un compañero:',
    options: [
      { letter: 'A', text: 'Me cuesta que lleguen al destino', tier: 'Tier Bronce • OVR Est. 55 - 65', icon: '⚽' },
      { letter: 'B', text: 'Llegan la mitad de las veces', tier: 'Tier Plata • OVR Est. 66 - 74', icon: '🎯' },
      { letter: 'C', text: 'Llegan casi siempre si no hay rivales', tier: 'Tier Oro • OVR Est. 75 - 84', icon: '⭐', recommended: true },
      { letter: 'D', text: 'Llegan con precisión y a buen ritmo, también con rivales', tier: 'Tier Oro Pro • OVR Est. 80 - 84', icon: '🔥' },
      { letter: 'E', text: 'Pongo el balón donde quiero, raso o por aire', tier: 'Tier Élite • OVR Est. 85+', icon: '💎' }
    ]
  },
  {
    category: 'TÉCNICA',
    title: 'P6. Pierna Menos Hábil',
    context: 'Pase y remate con tu pierna no dominante:',
    options: [
      { letter: 'A', text: 'Prácticamente no la uso', tier: 'Tier Bronce • OVR Est. 55 - 65', icon: '⚽' },
      { letter: 'B', text: 'Solo para tocar suave y cerca', tier: 'Tier Plata • OVR Est. 66 - 74', icon: '🎯' },
      { letter: 'C', text: 'Puedo pasar y controlar con ella', tier: 'Tier Oro • OVR Est. 75 - 84', icon: '⭐', recommended: true },
      { letter: 'D', text: 'La uso con confianza durante el partido', tier: 'Tier Oro Pro • OVR Est. 80 - 84', icon: '🔥' },
      { letter: 'E', text: 'Casi no se nota cuál es mi pierna buena', tier: 'Tier Élite • OVR Est. 85+', icon: '💎' }
    ]
  },

  // LECTURA DE JUEGO (20%)
  {
    category: 'LECTURA DE JUEGO',
    title: 'P7. Experiencia Competitiva',
    context: '¿En qué nivel compites habitualmente?',
    options: [
      { letter: 'A', text: 'Casi nada, juego de vez en cuando con amigos', tier: 'Tier Bronce • OVR Est. 55 - 65', icon: '🏟️' },
      { letter: 'B', text: 'Pichangas regulares de fin de semana', tier: 'Tier Plata • OVR Est. 66 - 74', icon: '🏅' },
      { letter: 'C', text: 'Ligas de barrio o torneos amateur organizados', tier: 'Tier Oro • OVR Est. 75 - 84', icon: '⭐', recommended: true },
      { letter: 'D', text: 'Divisiones menores, academia formativa o interfacultades', tier: 'Tier Oro Pro • OVR Est. 80 - 84', icon: '🔥' },
      { letter: 'E', text: 'Liga federada, Copa Perú o semiprofesional', tier: 'Tier Élite • OVR Est. 85+', icon: '💎' }
    ]
  },
  {
    category: 'LECTURA DE JUEGO',
    title: 'P8. Posicionamiento Sin Balón',
    context: '¿Dónde te ubicas cuando el balón no está en tus pies?',
    options: [
      { letter: 'A', text: 'Voy detrás del balón, sin orden', tier: 'Tier Bronce • OVR Est. 55 - 65', icon: '🏟️' },
      { letter: 'B', text: 'A veces me ubico bien, a veces me pierdo', tier: 'Tier Plata • OVR Est. 66 - 74', icon: '🏅' },
      { letter: 'C', text: 'Mantengo mi zona y sigo indicaciones del equipo', tier: 'Tier Oro • OVR Est. 75 - 84', icon: '⭐', recommended: true },
      { letter: 'D', text: 'Me ubico bien y ayudo a compañeros sin que me lo pidan', tier: 'Tier Oro Pro • OVR Est. 80 - 84', icon: '🔥' },
      { letter: 'E', text: 'Leo la jugada antes y organizo tácticamente a los demás', tier: 'Tier Élite • OVR Est. 85+', icon: '💎' }
    ]
  },
  {
    category: 'LECTURA DE JUEGO',
    title: 'P9. Decisiones Bajo Presión',
    context: 'Tienes un rival encima y poco tiempo para pensar:',
    options: [
      { letter: 'A', text: 'Pateo el balón lejos o lo pierdo', tier: 'Tier Bronce • OVR Est. 55 - 65', icon: '🏟️' },
      { letter: 'B', text: 'Dudo y suelo perderlo', tier: 'Tier Plata • OVR Est. 66 - 74', icon: '🏅' },
      { letter: 'C', text: 'Elijo la opción segura casi siempre', tier: 'Tier Oro • OVR Est. 75 - 84', icon: '⭐', recommended: true },
      { letter: 'D', text: 'Elijo bien entre pasar, regatear o proteger', tier: 'Tier Oro Pro • OVR Est. 80 - 84', icon: '🔥' },
      { letter: 'E', text: 'Decido rápido y casi siempre acierto en espacios reducidos', tier: 'Tier Élite • OVR Est. 85+', icon: '💎' }
    ]
  }
];

const POSITION_QUESTIONS = {
  Portero: [
    {
      category: 'POSICIÓN (PORTERO)',
      title: 'P10. Reflejos Bajo Palos',
      context: 'Tiros cercanos y disparos a quemarropa:',
      options: [
        { letter: 'A', text: 'Casi no llego a los tiros' },
        { letter: 'B', text: 'Atajo los que van directo a mis manos' },
        { letter: 'C', text: 'Paro los tiros fuertes si van cerca de mí', recommended: true },
        { letter: 'D', text: 'Paro muchos tiros difíciles a las esquinas' },
        { letter: 'E', text: 'Salvo balones imposibles con frecuencia' }
      ]
    },
    {
      category: 'POSICIÓN (PORTERO)',
      title: 'P11. Juego Aéreo',
      context: 'Centros y balones colgados al área:',
      options: [
        { letter: 'A', text: 'Prefiero no salir, me da inseguridad' },
        { letter: 'B', text: 'Salgo poco y suelo soltar el balón' },
        { letter: 'C', text: 'Atrapo los centros fáciles con solvencia', recommended: true },
        { letter: 'D', text: 'Salgo con decisión y atrapo o despejo con puños' },
        { letter: 'E', text: 'Domino el área aérea y mis defensas confían en mí' }
      ]
    },
    {
      category: 'POSICIÓN (PORTERO)',
      title: 'P12. Mano a Mano',
      context: 'Delantero solo frente a tu arco:',
      options: [
        { letter: 'A', text: 'Me quedo en la línea y espero' },
        { letter: 'B', text: 'Salgo tarde casi siempre' },
        { letter: 'C', text: 'Salgo, aunque no siempre acierto el momento', recommended: true },
        { letter: 'D', text: 'Cierro bien el ángulo y me tiro en el momento justo' },
        { letter: 'E', text: 'Gano la mayoría de los uno contra uno' }
      ]
    },
    {
      category: 'POSICIÓN (PORTERO)',
      title: 'P13. Saque y Juego con Pies',
      context: 'Saques y distribución desde la portería:',
      options: [
        { letter: 'A', text: 'Despejo lejos sin dirección' },
        { letter: 'B', text: 'Solo puedo sacar con la mano' },
        { letter: 'C', text: 'Saco bien de mano y paso corto', recommended: true },
        { letter: 'D', text: 'Saco con precisión de mano y pie' },
        { letter: 'E', text: 'Inicio el juego y pongo pases largos precisos' }
      ]
    },
    {
      category: 'POSICIÓN (PORTERO)',
      title: 'P14. Liderazgo y Voz de Mando',
      context: 'Organizar la barrera y la defensa:',
      options: [
        { letter: 'A', text: 'No hablo durante el partido' },
        { letter: 'B', text: 'Solo grito cuando hay peligro inminente' },
        { letter: 'C', text: 'Doy indicaciones básicas de marca', recommended: true },
        { letter: 'D', text: 'Organizo la barrera y ordeno la línea defensiva' },
        { letter: 'E', text: 'Soy el líder del equipo en todo momento' }
      ]
    }
  ],
  Defensa: [
    {
      category: 'POSICIÓN (DEFENSA)',
      title: 'P10. Uno contra Uno Defensivo',
      context: 'Un atacante veloz te encara de frente:',
      options: [
        { letter: 'A', text: 'Me pasan con facilidad' },
        { letter: 'B', text: 'Me pasan casi siempre, pero corro para recuperar' },
        { letter: 'C', text: 'Los freno a menudo, hago faltas tácticas', recommended: true },
        { letter: 'D', text: 'Los freno la mayoría de veces y sé cuándo entrar' },
        { letter: 'E', text: 'Casi nadie me supera y robo el balón limpio' }
      ]
    },
    {
      category: 'POSICIÓN (DEFENSA)',
      title: 'P11. Juego Aéreo Defensivo',
      context: 'Despejes y disputas de cabeza:',
      options: [
        { letter: 'A', text: 'Evito cabecear' },
        { letter: 'B', text: 'Cabeceo, pero sin dirección ni fuerza' },
        { letter: 'C', text: 'Despejo bien si no me presionan en el salto', recommended: true },
        { letter: 'D', text: 'Gano la mayoría de los duelos aéreos' },
        { letter: 'E', text: 'Domino el juego aéreo en ambas áreas' }
      ]
    },
    {
      category: 'POSICIÓN (DEFENSA)',
      title: 'P12. Anticipación y Corte',
      context: 'Cortar pases antes de que lleguen al delantero:',
      options: [
        { letter: 'A', text: 'Reacciono cuando el pase ya fue completado' },
        { letter: 'B', text: 'A veces intercepto balones por suerte' },
        { letter: 'C', text: 'Intercepto pases predecibles con solvencia', recommended: true },
        { letter: 'D', text: 'Leo bien la jugada y corto varios pases por partido' },
        { letter: 'E', text: 'Me adelanto casi siempre y corto el ataque rival' }
      ]
    },
    {
      category: 'POSICIÓN (DEFENSA)',
      title: 'P13. Salida Limpia de Balón',
      context: 'Sacar el balón jugado desde atrás:',
      options: [
        { letter: 'A', text: 'Despejo lo más lejos que puedo' },
        { letter: 'B', text: 'Paso corto y sin riesgo al arquero' },
        { letter: 'C', text: 'Paso bien a los mediocampistas sin presión', recommended: true },
        { letter: 'D', text: 'Progreso con pase o conducción bajo presión' },
        { letter: 'E', text: 'Doy pases largos precisos y rompo líneas rivales' }
      ]
    },
    {
      category: 'POSICIÓN (DEFENSA)',
      title: 'P14. Posicionamiento y Coberturas',
      context: 'Mantener la línea defensiva y hacer relevos:',
      options: [
        { letter: 'A', text: 'Me pierdo la marca con frecuencia' },
        { letter: 'B', text: 'Marco al hombre, pero dejo huecos a mis espaldas' },
        { letter: 'C', text: 'Cubro mi zona con orden táctico', recommended: true },
        { letter: 'D', text: 'Cubro a compañeros y mantengo la línea ordenada' },
        { letter: 'E', text: 'Dirijo la línea y controlo los fueras de juego' }
      ]
    }
  ],
  Mediocampista: [
    {
      category: 'POSICIÓN (MEDIOCAMPO)',
      title: 'P10. Pase Bajo Presión',
      context: 'En espacios reducidos con presión rival:',
      options: [
        { letter: 'A', text: 'Pierdo el balón casi siempre' },
        { letter: 'B', text: 'Lo entrego apurado y suelo fallar' },
        { letter: 'C', text: 'Mantengo la posesión con toques simples', recommended: true },
        { letter: 'D', text: 'Doy buenos pases progresivos bajo presión' },
        { letter: 'E', text: 'Juego con calma y desmarco a mis compañeros' }
      ]
    },
    {
      category: 'POSICIÓN (MEDIOCAMPO)',
      title: 'P11. Visión y Distribución',
      context: 'Cambios de frente y pases filtrados:',
      options: [
        { letter: 'A', text: 'Solo veo al compañero más cercano' },
        { letter: 'B', text: 'A veces intento el pase largo' },
        { letter: 'C', text: 'Cambio de frente cuando tengo espacio', recommended: true },
        { letter: 'D', text: 'Filtro pases entre líneas con frecuencia' },
        { letter: 'E', text: 'Encuentro el pase quirúrgico que rompe defensas' }
      ]
    },
    {
      category: 'POSICIÓN (MEDIOCAMPO)',
      title: 'P12. Tiro de Media Distancia',
      context: 'Remates desde fuera del área:',
      options: [
        { letter: 'A', text: 'Casi nunca remato de lejos' },
        { letter: 'B', text: 'Remato, pero raramente va a portería' },
        { letter: 'C', text: 'Tiro al arco con potencia moderada', recommended: true },
        { letter: 'D', text: 'Meto goles de media distancia con cierta frecuencia' },
        { letter: 'E', text: 'Es un arma constante con potencia y colocación' }
      ]
    },
    {
      category: 'POSICIÓN (MEDIOCAMPO)',
      title: 'P13. Recuperación y Presión',
      context: 'Robar el balón en el centro del campo:',
      options: [
        { letter: 'A', text: 'Me cuesta recuperar la pelota' },
        { letter: 'B', text: 'Recupero cuando el rival comete errores' },
        { letter: 'C', text: 'Recupero por esfuerzo y recorrido', recommended: true },
        { letter: 'D', text: 'Robo balones y presiono con criterio táctico' },
        { letter: 'E', text: 'Soy el motor de recuperación de mi equipo' }
      ]
    },
    {
      category: 'POSICIÓN (MEDIOCAMPO)',
      title: 'P14. Ida y Vuelta (Box-to-Box)',
      context: 'Acompañar el ataque y regresar a defender:',
      options: [
        { letter: 'A', text: 'Me quedo estático en una sola zona' },
        { letter: 'B', text: 'Solo ataco o solo defiendo, no ambas' },
        { letter: 'C', text: 'Subo y bajo con regularidad durante el partido', recommended: true },
        { letter: 'D', text: 'Llego al área rival y repliego a tiempo' },
        { letter: 'E', text: 'Aparezco en toda la cancha, arriba y abajo' }
      ]
    }
  ],
  Delantero: [
    {
      category: 'POSICIÓN (DELANTERO)',
      title: 'P10. Definición en el Área',
      context: 'Mano a mano y remates dentro del área:',
      options: [
        { letter: 'A', text: 'Casi no llego a disparar al arco' },
        { letter: 'B', text: 'Llego al arco, pero pocas veces es gol' },
        { letter: 'C', text: 'Convierto las oportunidades fáciles', recommended: true },
        { letter: 'D', text: 'Meto opciones claras y algunas difíciles' },
        { letter: 'E', text: 'Defino con ambos pies y cabeza, casi siempre entra' }
      ]
    },
    {
      category: 'POSICIÓN (DELANTERO)',
      title: 'P11. Desmarque y Movilidad',
      context: 'Movimientos sin balón en zona ofensiva:',
      options: [
        { letter: 'A', text: 'Espero el balón parado sin moverme' },
        { letter: 'B', text: 'Me muevo cuando mis compañeros me lo piden' },
        { letter: 'C', text: 'Me desmarco cuando el balón está cerca', recommended: true },
        { letter: 'D', text: 'Ataco espacios libres y me ofrezco como opción' },
        { letter: 'E', text: 'Leo a la defensa y aparezco en el punto exacto' }
      ]
    },
    {
      category: 'POSICIÓN (DELANTERO)',
      title: 'P12. Regate y Duelo 1v1',
      context: 'Encarar mano a mano a un defensa rival:',
      options: [
        { letter: 'A', text: 'Pierdo el balón al intentar driblar' },
        { letter: 'B', text: 'Lo intento y casi siempre me lo quitan' },
        { letter: 'C', text: 'Gano la mitad de mis regates', recommended: true },
        { letter: 'D', text: 'Gano la mayoría con velocidad y quiebre' },
        { letter: 'E', text: 'Desequilibro con facilidad incluso ante dos rivales' }
      ]
    },
    {
      category: 'POSICIÓN (DELANTERO)',
      title: 'P13. Juego de Espaldas al Arco',
      context: 'Recibir aguantando la marca de espaldas:',
      options: [
        { letter: 'A', text: 'Me presionan y pierdo la pelota' },
        { letter: 'B', text: 'Solo aguanto si me dan bastante espacio' },
        { letter: 'C', text: 'Protejo y descargo simple con un toque', recommended: true },
        { letter: 'D', text: 'Sostengo el balón y hago jugar a mi equipo' },
        { letter: 'E', text: 'Domino a los centrales y creo juego de espaldas' }
      ]
    },
    {
      category: 'POSICIÓN (DELANTERO)',
      title: 'P14. Presión Tras Pérdida',
      context: 'Tu reacción al perder el balón en ataque:',
      options: [
        { letter: 'A', text: 'Me detengo y reclamo o descanso' },
        { letter: 'B', text: 'Presiono solo si el balón quedó a un metro' },
        { letter: 'C', text: 'Presiono para incomodar la salida', recommended: true },
        { letter: 'D', text: 'Presiono con orden táctico y recupero arriba' },
        { letter: 'E', text: 'Soy el primer defensa del equipo e inicio la presión' }
      ]
    }
  ]
};

export default function FootballLevelTestScreen({ user, onFinishTest, onCancel }) {
  const userPos = user?.position === 'POR' ? 'Portero' : user?.position === 'DEF' ? 'Defensa' : user?.position === 'MED' ? 'Mediocampista' : 'Delantero';
  const posQuestions = POSITION_QUESTIONS[userPos] || POSITION_QUESTIONS.Delantero;
  const allQuestions = [...COMMON_QUESTIONS, ...posQuestions];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(14).fill(null));
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Reanudar test si existían respuestas guardadas localmente (MS-10 / V-05)
  useEffect(() => {
    (async () => {
      try {
        const partial = await storage.getPartialTestAnswers();
        if (Array.isArray(partial) && partial.length === 14) {
          setAnswers(partial);
          const nextUnanswered = partial.findIndex(a => a === null);
          if (nextUnanswered !== -1) {
            setCurrentIndex(nextUnanswered);
          } else {
            setCurrentIndex(13);
          }
        }
      } catch (err) {
        console.warn('[TEST] Error restaurando progreso parcial:', err);
      }
    })();
  }, []);

  const currentQ = allQuestions[currentIndex];
  const answeredCount = answers.filter(a => a !== null).length;
  const progressPercent = Math.round(((currentIndex + 1) / 14) * 100);

  // Estimador de OVR en vivo según las respuestas seleccionadas hasta ahora
  const answeredPoints = answers.reduce((acc, letter) => {
    if (!letter) return acc;
    const pts = letter === 'E' ? 100 : letter === 'D' ? 75 : letter === 'C' ? 50 : letter === 'B' ? 25 : 0;
    return acc + pts;
  }, 0);
  const liveAvg = answeredCount > 0 ? answeredPoints / answeredCount : 50;
  const liveOvr = Math.round(50 + (liveAvg / 100) * 35);
  const livePac = Math.min(85, Math.max(45, Math.round(liveOvr + 2)));
  const livePas = Math.min(85, Math.max(45, Math.round(liveOvr - 1)));
  const livePhy = Math.min(85, Math.max(45, Math.round(liveOvr + 1)));

  const handleSelectOption = (letter) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    const updated = [...answers];
    updated[currentIndex] = letter;
    setAnswers(updated);

    // Guardar progreso local inmediatamente
    storage.savePartialTestAnswers(updated);

    // Si aún quedan preguntas, avanzar automáticamente
    if (currentIndex < 13) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 160);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      try { Haptics.selectionAsync(); } catch {}
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleHelp = () => {
    try { Haptics.selectionAsync(); } catch {}
    Alert.alert(
      'Test Táctico Oficial MatchSport',
      'Este test de 14 preguntas calibrará tus 6 atributos FIFA (RIT, TIR, PAS, REG, DEF, FIS) y tu rating Glicko-2 inicial sin trampas ni números al azar. Responde con total honestidad: el sistema premiará tu juego limpio.'
    );
  };

  const handleSubmitTest = async () => {
    const unanswered = answers.findIndex(a => a === null);
    if (unanswered !== -1) {
      Alert.alert('Pregunta pendiente', `Por favor responde la pregunta ${unanswered + 1} antes de finalizar.`);
      setCurrentIndex(unanswered);
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setLoading(true);

      const res = await api.submitFootballTest({
        userId: user.id,
        answers,
        position: userPos
      });

      // Limpiar progreso parcial una vez completado satisfactoriamente
      await storage.clearPartialTestAnswers();

      const updatedUser = res.user || {
        ...user,
        hasCompletedTest: true,
        testScore: res.result?.score,
        testLevel: res.result?.level,
        testBreakdown: res.result?.breakdown,
        futStats: res.result?.futStats || res.user?.futStats
      };

      await storage.saveUserSession(updatedUser);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTestResult(res.result);
    } catch (err) {
      console.error('[TEST] Error enviando:', err);
      Alert.alert('Error', err.message || 'No se pudo procesar el test de fútbol.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // PANTALLA DE RESULTADOS DEL TEST (CARTA FUT ESTIMADA)
  // ==========================================
  if (testResult) {
    const { score, level, breakdown, futStats } = testResult;
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.resultHeader}>
            <View style={styles.resultBadgeWrap}>
              <Text style={styles.resultBadgeText}>🎯 NIVEL INICIAL ESTIMADO</Text>
            </View>
            <Text style={styles.resultTitle}>Carta Oficial de Jugador</Text>
            <Text style={styles.resultSub}>
              {user?.name || 'Jugador'} • {userPos.toUpperCase()} • {user?.district || 'Lima'}
            </Text>
          </View>

          {/* Tarjeta FIFA / OVR de Nivel */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreTop}>
              <View>
                <Text style={styles.scoreLabel}>NIVEL ESTIMADO</Text>
                <Text style={styles.scoreNum}>
                  {futStats?.ovr || Math.round(50 + (score / 100) * 35)}
                  <Text style={styles.scoreTotal}> OVR</Text>
                </Text>
                <Text style={styles.scoreScoreText}>Test Oficial: {score}/100 pts</Text>
              </View>

              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{level.toUpperCase()}</Text>
              </View>
            </View>

            {/* 6 Atributos Deterministas de la Carta */}
            {futStats && (
              <View style={styles.futStatsGrid}>
                <View style={styles.futStatCol}>
                  <Text style={styles.futStatLabel}>RIT</Text>
                  <Text style={styles.futStatVal}>{futStats.rit}</Text>
                </View>
                <View style={styles.futStatCol}>
                  <Text style={styles.futStatLabel}>TIR</Text>
                  <Text style={styles.futStatVal}>{futStats.tir}</Text>
                </View>
                <View style={styles.futStatCol}>
                  <Text style={styles.futStatLabel}>PAS</Text>
                  <Text style={styles.futStatVal}>{futStats.pas}</Text>
                </View>
                <View style={styles.futStatCol}>
                  <Text style={styles.futStatLabel}>REG</Text>
                  <Text style={styles.futStatVal}>{futStats.reg}</Text>
                </View>
                <View style={styles.futStatCol}>
                  <Text style={styles.futStatLabel}>DEF</Text>
                  <Text style={styles.futStatVal}>{futStats.def}</Text>
                </View>
                <View style={styles.futStatCol}>
                  <Text style={styles.futStatLabel}>FIS</Text>
                  <Text style={styles.futStatVal}>{futStats.fis}</Text>
                </View>
              </View>
            )}

            {/* Desglose por Categorías Oficiales */}
            <View style={styles.categoriesWrap}>
              <View style={styles.categoryRow}>
                <Text style={styles.catName}>FÍSICO (20%)</Text>
                <View style={styles.catTrack}>
                  <View style={[styles.catFill, { width: `${breakdown?.fisico || 50}%` }]} />
                </View>
                <Text style={styles.catVal}>{breakdown?.fisico || 0}</Text>
              </View>

              <View style={styles.categoryRow}>
                <Text style={styles.catName}>TÉCNICA (25%)</Text>
                <View style={styles.catTrack}>
                  <View style={[styles.catFill, { width: `${breakdown?.tecnica || 50}%` }]} />
                </View>
                <Text style={styles.catVal}>{breakdown?.tecnica || 0}</Text>
              </View>

              <View style={styles.categoryRow}>
                <Text style={styles.catName}>LECTURA (20%)</Text>
                <View style={styles.catTrack}>
                  <View style={[styles.catFill, { width: `${breakdown?.lectura || 50}%` }]} />
                </View>
                <Text style={styles.catVal}>{breakdown?.lectura || 0}</Text>
              </View>

              <View style={styles.categoryRow}>
                <Text style={styles.catName}>POSICIÓN (35%)</Text>
                <View style={styles.catTrack}>
                  <View style={[styles.catFill, { width: `${breakdown?.posicion || 50}%` }]} />
                </View>
                <Text style={styles.catVal}>{breakdown?.posicion || 0}</Text>
              </View>
            </View>

            {/* Análisis Cualitativo */}
            <View style={styles.analysisBox}>
              <Text style={styles.analysisText}>
                💪 <Text style={{ fontWeight: '800', color: THEME.colors.neonPitch }}>Fortaleza:</Text> {breakdown?.strongPoint || 'Juego en equipo'}
              </Text>
              <Text style={styles.analysisText}>
                📈 <Text style={{ fontWeight: '800', color: THEME.colors.gold }}>Margen de mejora:</Text> {breakdown?.weakPoint || 'Resistencia'}
              </Text>
            </View>
          </View>

          {/* Nota Oficial de Transparencia */}
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              ℹ️ <Text style={{ fontWeight: '800', color: '#F1FFEF' }}>Nivel inicial estimado:</Text> Este puntaje es tu punto de partida derivado de tus 14 respuestas. Calibrará matemáticamente mediante Glicko-2 conforme disputes partidos oficiales en MatchSport.
            </Text>
          </View>

          {/* Botón Ir a la Cancha */}
          <TouchableOpacity
            style={styles.startPlayingBtn}
            onPress={() => {
              if (onFinishTest) onFinishTest();
            }}
            activeOpacity={0.88}
          >
            <Text style={styles.startPlayingText}>⚽ ¡ENTENDIDO, IR A LA CANCHA! ➔</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==========================================
  // PANTALLA PRINCIPAL: CUESTIONARIO DE 14 PREGUNTAS (OBSIDIAN PITCH)
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07090E" />

      {/* 1. Header Superior Fijo con Navegación y Progreso Integrado */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderNavRow}>
          {onCancel ? (
            <TouchableOpacity style={styles.circleBtn} onPress={onCancel} accessibilityLabel="Volver atrás">
              <Text style={styles.circleBtnText}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}

          <Text style={styles.headerCenterTitle}>TEST DE CALIBRACIÓN</Text>

          {onCancel ? (
            <TouchableOpacity style={styles.circleBtn} onPress={onCancel} accessibilityLabel="Cerrar test">
              <Text style={[styles.circleBtnText, { fontSize: 15 }]}>✕</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.circleBtn} onPress={handleHelp} accessibilityLabel="Ayuda">
              <Text style={styles.circleBtnText}>?</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sub-fila: Contador de Pregunta y Categoría */}
        <View style={styles.progressMetaRow}>
          <Text style={styles.progressStepText}>Pregunta {currentIndex + 1} de 14</Text>
          <View style={styles.categoryPill}>
            <View style={styles.categoryPillDot} />
            <Text style={styles.categoryPillText}>{currentQ.category || 'TÁCTICA'}</Text>
          </View>
        </View>

        {/* Barra Segmentada de 14 Pasos */}
        <View style={styles.segmentedBar}>
          {Array.from({ length: 14 }).map((_, idx) => (
            <View
              key={`seg-${idx}`}
              style={[
                styles.segmentPiece,
                idx <= currentIndex && styles.segmentPieceActive
              ]}
            />
          ))}
        </View>
      </View>

      {/* 2. Cuerpo Scrolleable: Pregunta y Opciones */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Pregunta */}
        <View style={styles.questionBlock}>
          <Text style={styles.questionTitle}>{currentQ.title}</Text>
          <Text style={styles.questionContext}>{currentQ.context}</Text>
        </View>

        {/* Opciones Interactivas */}
        <View style={styles.optionsStack}>
          {currentQ.options.map((opt) => {
            const isSelected = answers[currentIndex] === opt.letter;
            return (
              <TouchableOpacity
                key={opt.letter}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
                onPress={() => handleSelectOption(opt.letter)}
                activeOpacity={0.88}
              >
                {isSelected && <View style={styles.selectedGlowBar} />}

                <View style={styles.optionHeaderRow}>
                  <View style={[styles.optionIconBox, isSelected && styles.optionIconBoxSelected]}>
                    <Text style={styles.optionIcon}>{opt.icon || '⚽'}</Text>
                  </View>

                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionDescText, isSelected && styles.optionDescTextSelected]}>
                      {opt.text}
                    </Text>
                  </View>

                  <View style={[styles.radioIndicator, isSelected && styles.radioIndicatorSelected]}>
                    {isSelected ? (
                      <Text style={styles.radioCheckIcon}>✓</Text>
                    ) : (
                      <View style={styles.radioInnerUnselected} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* 3. Barra de Acciones Fija Inferior */}
      <View style={styles.fixedBottomBar}>
        <View style={styles.bottomActionsRow}>
          {currentIndex > 0 && (
            <TouchableOpacity style={styles.prevBtn} onPress={handlePrev} activeOpacity={0.85}>
              <Text style={styles.prevBtnText}>‹ Anterior</Text>
            </TouchableOpacity>
          )}

          {currentIndex === 13 ? (
            <TouchableOpacity
              style={[styles.nextCtaBtn, answers[13] === null && { opacity: 0.5 }]}
              onPress={handleSubmitTest}
              disabled={loading || answers[13] === null}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={THEME.colors.surfaceLowest} />
              ) : (
                <Text style={styles.nextCtaBtnText}>CALCULAR MI CARTA FUT ➔</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nextCtaBtn}
              onPress={() => {
                if (answers[currentIndex]) {
                  setCurrentIndex(currentIndex + 1);
                } else {
                  Alert.alert('Selecciona una opción', 'Elige una de las alternativas antes de continuar.');
                }
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.nextCtaBtnText}>SIGUIENTE ➔</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Barra Home Indicator estilo iOS */}
        <View style={styles.homeIndicatorWrapper}>
          <View style={styles.homeIndicator} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
  },
  topHeader: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#07090E',
    gap: 10,
    zIndex: 10,
  },
  topHeaderNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnText: {
    color: '#F1FFEF',
    fontSize: 16,
    fontWeight: '800',
  },
  headerCenterTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  progressMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  progressStepText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 5,
  },
  categoryPillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00FF87',
  },
  categoryPillText: {
    color: '#00FF87',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  segmentedBar: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
    height: 4.5,
  },
  segmentPiece: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  segmentPieceActive: {
    backgroundColor: '#00FF87',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
  },
  questionBlock: {
    gap: 6,
    paddingBottom: 2,
  },
  questionTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 27,
  },
  questionContext: {
    color: '#94A3B8',
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '400',
  },
  optionsStack: {
    gap: 11,
  },
  optionCard: {
    backgroundColor: '#10141D',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  optionCardSelected: {
    backgroundColor: '#151C28',
    borderColor: '#00FF87',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  selectedGlowBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: '#00FF87',
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconBoxSelected: {
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
    borderColor: 'rgba(0, 255, 135, 0.4)',
  },
  optionIcon: {
    fontSize: 19,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionDescText: {
    color: '#F1FFEF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  optionDescTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  radioIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioIndicatorSelected: {
    borderColor: '#00FF87',
    backgroundColor: '#00FF87',
  },
  radioCheckIcon: {
    color: '#06080D',
    fontSize: 13,
    fontWeight: '900',
  },
  radioInnerUnselected: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  fixedBottomBar: {
    backgroundColor: '#07090E',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    zIndex: 20,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prevBtn: {
    width: 96,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  prevBtnText: {
    color: '#F1FFEF',
    fontSize: 14,
    fontWeight: '700',
  },
  nextCtaBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#00FF87',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  nextCtaBtnText: {
    color: '#06080D',
    fontSize: 14.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  homeIndicatorWrapper: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  homeIndicator: {
    width: 130,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  // Estilos de la vista de Resultados
  resultScroll: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
    paddingBottom: 40,
  },
  resultHeader: {
    alignItems: 'center',
    gap: 4,
  },
  resultBadgeWrap: {
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.3)',
    marginBottom: 4,
  },
  resultBadgeText: {
    color: THEME.colors.neonPitch,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  resultTitle: {
    color: '#F1FFEF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  resultSub: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  scoreTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    color: THEME.colors.outline,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  scoreNum: {
    color: '#F1FFEF',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  scoreTotal: {
    color: THEME.colors.neonPitch,
    fontSize: 16,
  },
  scoreScoreText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '600',
  },
  levelBadge: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.35)',
  },
  levelBadgeText: {
    color: THEME.colors.neonPitch,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  futStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceLow,
    padding: 10,
    borderRadius: 8,
  },
  futStatCol: {
    alignItems: 'center',
  },
  futStatLabel: {
    color: THEME.colors.outline,
    fontSize: 10,
    fontWeight: '800',
  },
  futStatVal: {
    color: '#F1FFEF',
    fontSize: 16,
    fontWeight: '900',
  },
  categoriesWrap: {
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catName: {
    width: 100,
    color: THEME.colors.onSurfaceVariant,
    fontSize: 9.5,
    fontWeight: '700',
  },
  catTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.surfaceLowest,
    overflow: 'hidden',
  },
  catFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: THEME.colors.neonPitch,
  },
  catVal: {
    width: 24,
    textAlign: 'right',
    color: '#F1FFEF',
    fontSize: 11,
    fontWeight: '800',
  },
  analysisBox: {
    backgroundColor: THEME.colors.surfaceLow,
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  analysisText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11.5,
    lineHeight: 16,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoBoxText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11.5,
    lineHeight: 17,
  },
  startPlayingBtn: {
    height: 50,
    borderRadius: 999,
    backgroundColor: THEME.colors.neonPitch,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  startPlayingText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
