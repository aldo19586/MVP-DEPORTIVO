import React, { useState } from 'react';
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

// Banco Oficial de Preguntas extraído de test-nivel-futbol-amateur.md
const COMMON_QUESTIONS = [
  // FÍSICO (20%)
  {
    category: 'FÍSICO',
    title: 'P1. Velocidad',
    context: 'Piensa en una carrera de unos 30 metros:',
    options: [
      { letter: 'A', text: 'Casi siempre me alcanzan o llego de los últimos' },
      { letter: 'B', text: 'Soy más lento que la mayoría de mi grupo' },
      { letter: 'C', text: 'Estoy en el promedio de mi grupo' },
      { letter: 'D', text: 'Soy de los más rápidos de mi grupo' },
      { letter: 'E', text: 'Rara vez alguien me gana en velocidad, incluso en ligas' }
    ]
  },
  {
    category: 'FÍSICO',
    title: 'P2. Resistencia',
    context: '¿Cómo llegas al final de un partido de 60 minutos?',
    options: [
      { letter: 'A', text: 'Me canso a los 15 o 20 minutos' },
      { letter: 'B', text: 'Aguanto media hora y luego camino bastante' },
      { letter: 'C', text: 'Llego bien, aunque bajo el ritmo al final' },
      { letter: 'D', text: 'Llego bien y puedo repetir esfuerzos hasta el final' },
      { letter: 'E', text: 'Corro todo el partido a intensidad alta sin problema' }
    ]
  },
  {
    category: 'FÍSICO',
    title: 'P3. Duelos y contacto',
    context: 'Hombro con hombro y balones divididos:',
    options: [
      { letter: 'A', text: 'Evito los choques, me sacan del balón fácilmente' },
      { letter: 'B', text: 'Pierdo casi todos los duelos físicos' },
      { letter: 'C', text: 'Gano la mitad de los duelos' },
      { letter: 'D', text: 'Protejo bien el balón y gano la mayoría' },
      { letter: 'E', text: 'Domino los duelos, cuesta mucho que me muevan' }
    ]
  },

  // TÉCNICA (25%)
  {
    category: 'TÉCNICA',
    title: 'P4. Control del balón',
    context: 'Te llega un pase fuerte y a media altura:',
    options: [
      { letter: 'A', text: 'Se me escapa casi siempre' },
      { letter: 'B', text: 'Lo paro, pero necesito varios toques' },
      { letter: 'C', text: 'Lo controlo bien si no tengo rival cerca' },
      { letter: 'D', text: 'Lo controlo y ya lo dejo orientado hacia donde voy' },
      { letter: 'E', text: 'Lo controlo bien con cualquier superficie, incluso presionado' }
    ]
  },
  {
    category: 'TÉCNICA',
    title: 'P5. Pase',
    context: 'Pases de unos 20 metros a un compañero:',
    options: [
      { letter: 'A', text: 'Me cuesta que lleguen al destino' },
      { letter: 'B', text: 'Llegan la mitad de las veces' },
      { letter: 'C', text: 'Llegan casi siempre si no hay rivales' },
      { letter: 'D', text: 'Llegan con precisión y a buen ritmo, también con rivales' },
      { letter: 'E', text: 'Pongo el balón donde quiero, raso o por aire' }
    ]
  },
  {
    category: 'TÉCNICA',
    title: 'P6. Pierna menos hábil',
    context: 'Pase y remate con la pierna no dominante:',
    options: [
      { letter: 'A', text: 'Prácticamente no la uso' },
      { letter: 'B', text: 'Solo para tocar suave y cerca' },
      { letter: 'C', text: 'Puedo pasar y controlar con ella' },
      { letter: 'D', text: 'La uso con confianza durante el partido' },
      { letter: 'E', text: 'Casi no se nota cuál es mi pierna buena' }
    ]
  },

  // LECTURA DE JUEGO (20%)
  {
    category: 'LECTURA DE JUEGO',
    title: 'P7. Experiencia',
    context: '¿Cuánto has jugado de forma regular?',
    options: [
      { letter: 'A', text: 'Casi nada, juego de vez en cuando' },
      { letter: 'B', text: 'Con amigos, sin mucha frecuencia' },
      { letter: 'C', text: 'Con amigos cada semana desde hace años' },
      { letter: 'D', text: 'En ligas amateur o torneos organizados' },
      { letter: 'E', text: 'En academia, liga federada o semiprofesional' }
    ]
  },
  {
    category: 'LECTURA DE JUEGO',
    title: 'P8. Sin el balón',
    context: '¿Sabes dónde ubicarte cuando el balón no está contigo?',
    options: [
      { letter: 'A', text: 'Voy detrás del balón, sin orden' },
      { letter: 'B', text: 'A veces me ubico bien, a veces me pierdo' },
      { letter: 'C', text: 'Mantengo mi zona y sigo indicaciones' },
      { letter: 'D', text: 'Me ubico bien y ayudo a compañeros sin que me lo pidan' },
      { letter: 'E', text: 'Leo la jugada antes y organizo a los demás' }
    ]
  },
  {
    category: 'LECTURA DE JUEGO',
    title: 'P9. Decisiones bajo presión',
    context: 'Tienes un rival encima y poco tiempo para pensar:',
    options: [
      { letter: 'A', text: 'Pateo el balón lejos o lo pierdo' },
      { letter: 'B', text: 'Dudo y suelo perderlo' },
      { letter: 'C', text: 'Elijo la opción segura casi siempre' },
      { letter: 'D', text: 'Elijo bien entre pasar, regatear o proteger' },
      { letter: 'E', text: 'Decido rápido y casi siempre acierto, incluso en espacios cortos' }
    ]
  }
];

const POSITION_QUESTIONS = {
  Portero: [
    {
      category: 'POSICIÓN (PORTERO)',
      title: 'P10. Reflejos',
      context: 'Tiros cercanos y penales:',
      options: [
        { letter: 'A', text: 'Casi no llego a los tiros' },
        { letter: 'B', text: 'Atajo los que van directo a mis manos' },
        { letter: 'C', text: 'Paro los tiros fuertes si van cerca de mí' },
        { letter: 'D', text: 'Paro muchos tiros a las esquinas' },
        { letter: 'E', text: 'Salvo balones muy difíciles con frecuencia' }
      ]
    },
    {
      category: 'POSICIÓN (PORTERO)',
      title: 'P11. Juego aéreo',
      context: 'Centros y balones colgados al área:',
      options: [
        { letter: 'A', text: 'Prefiero no salir, me da miedo' },
        { letter: 'B', text: 'Salgo poco y suelto el balón' },
        { letter: 'C', text: 'Atrapo los centros fáciles' },
        { letter: 'D', text: 'Salgo con decisión y atrapo o despejo bien' },
        { letter: 'E', text: 'Domino el área aérea y mis defensas confían en mí' }
      ]
    },
    {
      category: 'POSICIÓN (PORTERO)',
      title: 'P12. Uno contra uno',
      context: 'Delantero solo frente a ti:',
      options: [
        { letter: 'A', text: 'Me quedo en la línea y espero' },
        { letter: 'B', text: 'Salgo tarde casi siempre' },
        { letter: 'C', text: 'Salgo, aunque no siempre acierto el momento' },
        { letter: 'D', text: 'Cierro bien el ángulo y me tiro en el momento justo' },
        { letter: 'E', text: 'Gano la mayoría de los uno contra uno' }
      ]
    },
    {
      category: 'POSICIÓN (PORTERO)',
      title: 'P13. Juego con los pies',
      context: 'Saques y pases desde la portería:',
      options: [
        { letter: 'A', text: 'Despejo lejos sin dirección' },
        { letter: 'B', text: 'Solo puedo sacar con la mano' },
        { letter: 'C', text: 'Saco bien de mano y paso corto' },
        { letter: 'D', text: 'Saco con precisión de mano y pie' },
        { letter: 'E', text: 'Inicio el juego y hasta pongo pases largos precisos' }
      ]
    },
    {
      category: 'POSICIÓN (PORTERO)',
      title: 'P14. Comunicación',
      context: 'Dirigir y organizar a tu defensa:',
      options: [
        { letter: 'A', text: 'No hablo durante el partido' },
        { letter: 'B', text: 'Solo grito cuando hay peligro' },
        { letter: 'C', text: 'Doy indicaciones básicas' },
        { letter: 'D', text: 'Organizo la barrera y la línea defensiva' },
        { letter: 'E', text: 'Soy el líder del equipo en todo momento' }
      ]
    }
  ],
  Defensa: [
    {
      category: 'POSICIÓN (DEFENSA)',
      title: 'P10. Uno contra uno defendiendo',
      context: 'Un atacante rápido te encara:',
      options: [
        { letter: 'A', text: 'Me pasan con facilidad' },
        { letter: 'B', text: 'Me pasan casi siempre, pero corro para seguir' },
        { letter: 'C', text: 'Los freno a veces, hago faltas para parar' },
        { letter: 'D', text: 'Los freno la mayoría y sé cuándo entrar' },
        { letter: 'E', text: 'Casi nadie me supera y robo el balón limpio' }
      ]
    },
    {
      category: 'POSICIÓN (DEFENSA)',
      title: 'P11. Juego aéreo',
      context: 'Despejes y disputas de cabeza:',
      options: [
        { letter: 'A', text: 'Evito cabecear' },
        { letter: 'B', text: 'Cabeceo, pero sin dirección ni fuerza' },
        { letter: 'C', text: 'Despejo bien si no me presionan' },
        { letter: 'D', text: 'Gano la mayoría de los duelos aéreos' },
        { letter: 'E', text: 'Domino el juego aéreo en ambas áreas' }
      ]
    },
    {
      category: 'POSICIÓN (DEFENSA)',
      title: 'P12. Anticipación',
      context: 'Cortar pases antes de que lleguen:',
      options: [
        { letter: 'A', text: 'Reacciono cuando ya pasó' },
        { letter: 'B', text: 'A veces intercepto por suerte' },
        { letter: 'C', text: 'Intercepto pases predecibles' },
        { letter: 'D', text: 'Leo bien y corto varios pases por partido' },
        { letter: 'E', text: 'Me adelanto casi siempre y corto la jugada' }
      ]
    },
    {
      category: 'POSICIÓN (DEFENSA)',
      title: 'P13. Salida de balón',
      context: 'Sacar el balón jugado desde atrás:',
      options: [
        { letter: 'A', text: 'Despejo lo más lejos que puedo' },
        { letter: 'B', text: 'Paso corto y sin riesgo' },
        { letter: 'C', text: 'Paso bien a los medios si no me presionan' },
        { letter: 'D', text: 'Progreso con pase o conducción bajo presión' },
        { letter: 'E', text: 'Doy pases largos precisos y rompo líneas' }
      ]
    },
    {
      category: 'POSICIÓN (DEFENSA)',
      title: 'P14. Posicionamiento',
      context: 'Línea defensiva y coberturas:',
      options: [
        { letter: 'A', text: 'Me pierdo la marca con frecuencia' },
        { letter: 'B', text: 'Marco al hombre, pero dejo huecos' },
        { letter: 'C', text: 'Cubro mi zona con orden' },
        { letter: 'D', text: 'Cubro a compañeros y mantengo la línea' },
        { letter: 'E', text: 'Dirijo la línea y controlo el fuera de juego' }
      ]
    }
  ],
  Mediocampista: [
    {
      category: 'POSICIÓN (MEDIOCAMPO)',
      title: 'P10. Pase bajo presión',
      context: 'Rondo o partido con muy poco espacio:',
      options: [
        { letter: 'A', text: 'Pierdo el balón casi siempre' },
        { letter: 'B', text: 'Lo entrego, pero me presionan y fallo' },
        { letter: 'C', text: 'Mantengo la posesión con toques simples' },
        { letter: 'D', text: 'Doy buenos pases con presión encima' },
        { letter: 'E', text: 'Juego con calma y desmarco a los demás' }
      ]
    },
    {
      category: 'POSICIÓN (MEDIOCAMPO)',
      title: 'P11. Visión de juego',
      context: 'Cambios de orientación y pases entre líneas:',
      options: [
        { letter: 'A', text: 'Solo veo al compañero más cercano' },
        { letter: 'B', text: 'A veces veo el pase largo' },
        { letter: 'C', text: 'Cambio de orientación cuando hay espacio' },
        { letter: 'D', text: 'Veo pases entre líneas con frecuencia' },
        { letter: 'E', text: 'Encuentro el pase que rompe al equipo rival' }
      ]
    },
    {
      category: 'POSICIÓN (MEDIOCAMPO)',
      title: 'P12. Tiro de media distancia',
      context: 'Remates desde fuera del área:',
      options: [
        { letter: 'A', text: 'Casi no remato de lejos' },
        { letter: 'B', text: 'Remato, pero raramente entra o va al arco' },
        { letter: 'C', text: 'Tiro al arco, con potencia moderada' },
        { letter: 'D', text: 'Meto goles de lejos de vez en cuando' },
        { letter: 'E', text: 'Es un arma constante, con potencia y colocación' }
      ]
    },
    {
      category: 'POSICIÓN (MEDIOCAMPO)',
      title: 'P13. Recuperación',
      context: 'Robar el balón y presionar:',
      options: [
        { letter: 'A', text: 'Me cuesta recuperar' },
        { letter: 'B', text: 'Recupero cuando el rival se equivoca' },
        { letter: 'C', text: 'Recupero por esfuerzo y ganas' },
        { letter: 'D', text: 'Robo bien y presiono con criterio' },
        { letter: 'E', text: 'Soy el motor de la recuperación en mi equipo' }
      ]
    },
    {
      category: 'POSICIÓN (MEDIOCAMPO)',
      title: 'P14. Ida y vuelta',
      context: 'Llegar al ataque y regresar a defender:',
      options: [
        { letter: 'A', text: 'Me quedo en una sola zona' },
        { letter: 'B', text: 'Ataco o defiendo, pero no ambas' },
        { letter: 'C', text: 'Subo y bajo con buena regularidad' },
        { letter: 'D', text: 'Llego al área y regreso a tiempo' },
        { letter: 'E', text: 'Aparezco en toda la cancha, arriba y abajo' }
      ]
    }
  ],
  Delantero: [
    {
      category: 'POSICIÓN (DELANTERO)',
      title: 'P10. Definición',
      context: 'Remates dentro del área:',
      options: [
        { letter: 'A', text: 'Casi no llego al arco' },
        { letter: 'B', text: 'Llego al arco, pero pocas veces entra' },
        { letter: 'C', text: 'Meto los fáciles' },
        { letter: 'D', text: 'Meto oportunidades claras y algunas difíciles' },
        { letter: 'E', text: 'Defino con ambos pies y de cabeza, casi siempre entra' }
      ]
    },
    {
      category: 'POSICIÓN (DELANTERO)',
      title: 'P11. Desmarque',
      context: 'Movimientos sin balón en zona ofensiva:',
      options: [
        { letter: 'A', text: 'Espero el balón parado' },
        { letter: 'B', text: 'Me muevo cuando me lo piden' },
        { letter: 'C', text: 'Me desmarco cuando el balón está cerca' },
        { letter: 'D', text: 'Ataco espacios libres y busco recibir' },
        { letter: 'E', text: 'Leo a la defensa y aparezco en el punto exacto' }
      ]
    },
    {
      category: 'POSICIÓN (DELANTERO)',
      title: 'P12. Regate',
      context: 'Uno contra uno frente a un defensa:',
      options: [
        { letter: 'A', text: 'Pierdo el balón al intentar' },
        { letter: 'B', text: 'Lo intento y casi siempre me lo quitan' },
        { letter: 'C', text: 'Gano la mitad de los regates' },
        { letter: 'D', text: 'Gano la mayoría con cambios de ritmo' },
        { letter: 'E', text: 'Desequilibro con facilidad, incluso con dos rivales' }
      ]
    },
    {
      category: 'POSICIÓN (DELANTERO)',
      title: 'P13. Juego de espaldas',
      context: 'Recibir con un defensa pegado a la espalda:',
      options: [
        { letter: 'A', text: 'Me presionan y pierdo el balón' },
        { letter: 'B', text: 'Solo aguanto si tengo espacio' },
        { letter: 'C', text: 'Protejo y descargo simple' },
        { letter: 'D', text: 'Sostengo y hago jugar al equipo' },
        { letter: 'E', text: 'Domino a mis marcadores y creo juego de espaldas' }
      ]
    },
    {
      category: 'POSICIÓN (DELANTERO)',
      title: 'P14. Presión tras pérdida',
      context: 'Qué haces al perder el balón en ataque:',
      options: [
        { letter: 'A', text: 'Me detengo y espero' },
        { letter: 'B', text: 'Presiono si el balón está muy cerca' },
        { letter: 'C', text: 'Presiono a menudo' },
        { letter: 'D', text: 'Presiono con orden y sin hacer falta' },
        { letter: 'E', text: 'Soy el primer defensa del equipo' }
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

  const currentQ = allQuestions[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / 14) * 100);

  const handleSelectOption = (letter) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    const updated = [...answers];
    updated[currentIndex] = letter;
    setAnswers(updated);

    // Si aún faltan preguntas, pasar automáticamente a la siguiente tras breve delay
    if (currentIndex < 13) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      try { Haptics.selectionAsync(); } catch (e) {}
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmitTest = async () => {
    // Validar que todas estén respondidas
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

      const updatedUser = res.user || {
        ...user,
        hasCompletedTest: true,
        testScore: res.result?.score,
        testLevel: res.result?.level,
        testBreakdown: res.result?.breakdown
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
  // PANTALLA DE RESULTADOS DEL TEST
  // ==========================================
  if (testResult) {
    const { score, level, breakdown } = testResult;
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultBadgeText}>🎯 EVALUACIÓN COMPLETADA</Text>
            <Text style={styles.resultTitle}>Ficha Oficial de Nivel</Text>
            <Text style={styles.resultSub}>Jugador: <Text style={{ color: '#FFF', fontWeight: '900' }}>{user?.name}</Text> • {userPos.toUpperCase()}</Text>
          </View>

          {/* Tarjeta FIFA / OVR de Nivel */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreTop}>
              <View>
                <Text style={styles.scoreLabel}>PUNTAJE TEST</Text>
                <Text style={styles.scoreNum}>{score}<Text style={styles.scoreTotal}>/100</Text></Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{level.toUpperCase()}</Text>
              </View>
            </View>

            {/* Desglose por Categorías */}
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
                💪 <Text style={{ fontWeight: '800', color: THEME.colors.primary }}>Fortaleza:</Text> {breakdown?.strongPoint || 'Juego en equipo'}
              </Text>
              <Text style={styles.analysisText}>
                📈 <Text style={{ fontWeight: '800', color: THEME.colors.gold }}>Margen de mejora:</Text> {breakdown?.weakPoint || 'Resistencia'}
              </Text>
            </View>
          </View>

          {/* Nota Oficial de Transparencia */}
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              ℹ️ <Text style={{ fontWeight: '800', color: '#FFF' }}>Calibración activa:</Text> Este puntaje es tu punto de partida. Ahora deberás disputar tus primeros <Text style={{ fontWeight: '800', color: THEME.colors.primary }}>3 partidos</Text> en cancha para que el algoritmo Glicko-2 y la evaluación de tus rivales validen tu ranking oficial.
            </Text>
          </View>

          {/* Botón Ir a Jugar */}
          <TouchableOpacity
            style={styles.startPlayingBtn}
            onPress={() => {
              if (onFinishTest) onFinishTest();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.startPlayingText}>⚽ ¡ENTENDIDO, IR A LA CANCHA! ➔</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==========================================
  // PANTALLA DEL CUESTIONARIO (14 PREGUNTAS)
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        {onCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>✕</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.progressRow}>
            <Text style={styles.stepBadge}>PREGUNTA {currentIndex + 1} DE 14</Text>
            <Text style={styles.stepPercent}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.questionScroll} showsVerticalScrollIndicator={false}>
        {/* Categoría y Título */}
        <View style={styles.questionCard}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{currentQ.category}</Text>
          </View>
          <Text style={styles.qTitle}>{currentQ.title}</Text>
          <Text style={styles.qContext}>{currentQ.context}</Text>
        </View>

        {/* Opciones A, B, C, D, E */}
        <View style={styles.optionsWrap}>
          {currentQ.options.map((opt) => {
            const isSelected = answers[currentIndex] === opt.letter;
            return (
              <TouchableOpacity
                key={opt.letter}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => handleSelectOption(opt.letter)}
                activeOpacity={0.85}
              >
                <View style={[styles.optionLetterBadge, isSelected && styles.optionLetterSelected]}>
                  <Text style={[styles.optionLetterText, isSelected && styles.optionLetterTextSelected]}>
                    {opt.letter}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {opt.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Navegación y Envío */}
        <View style={styles.actionsRow}>
          {currentIndex > 0 && (
            <TouchableOpacity style={styles.prevBtn} onPress={handlePrev}>
              <Text style={styles.prevBtnText}>← Anterior</Text>
            </TouchableOpacity>
          )}

          {currentIndex === 13 && (
            <TouchableOpacity
              style={[styles.submitTestBtn, answers[13] === null && { opacity: 0.5 }]}
              onPress={handleSubmitTest}
              disabled={loading || answers[13] === null}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#00210B" />
              ) : (
                <Text style={styles.submitTestText}>OBTENER MI NIVEL Y PUNTAJE ➔</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgCanvas,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    gap: 14,
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.8,
  },
  stepPercent: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  progressBar: {
    height: 5,
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  questionScroll: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
    paddingBottom: 40,
  },
  questionCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.8,
  },
  qTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  qContext: {
    fontSize: 12.5,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  optionsWrap: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
  },
  optionCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
  },
  optionLetterBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  optionLetterSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  optionLetterText: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.textSecondary,
  },
  optionLetterTextSelected: {
    color: '#00210B',
  },
  optionText: {
    flex: 1,
    fontSize: 12.5,
    color: THEME.colors.textPrimary,
    lineHeight: 17,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  prevBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.cardElevated,
  },
  prevBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  submitTestBtn: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitTestText: {
    color: '#00210B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Estilos de la Pantalla de Resultado
  resultScroll: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 18,
    alignItems: 'center',
  },
  resultHeader: {
    alignItems: 'center',
    gap: 4,
  },
  resultBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 1,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  resultSub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  scoreCard: {
    width: '100%',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.gold,
    gap: 16,
  },
  scoreTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: 14,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  scoreNum: {
    fontSize: 34,
    fontWeight: '900',
    color: THEME.colors.gold,
  },
  scoreTotal: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
  },
  levelBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00210B',
    letterSpacing: 0.5,
  },
  categoriesWrap: {
    gap: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catName: {
    width: 105,
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  catTrack: {
    flex: 1,
    height: 8,
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  catFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 4,
  },
  catVal: {
    width: 24,
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    textAlign: 'right',
  },
  analysisBox: {
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: THEME.radius.md,
    padding: 12,
    gap: 6,
  },
  analysisText: {
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  infoBox: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  infoBoxText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
  },
  startPlayingBtn: {
    width: '100%',
    backgroundColor: THEME.colors.primary,
    height: 52,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  startPlayingText: {
    color: '#00210B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
