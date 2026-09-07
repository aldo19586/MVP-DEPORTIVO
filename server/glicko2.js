// Algoritmo Glicko-2 para cálculo de rating deportivo
// Basado en la especificación oficial de Mark E. Glickman (Boston University)

const DEFAULT_RATING = 1500;
const DEFAULT_RD = 350;
const DEFAULT_VOLATILITY = 0.06;
const TAU = 0.5; // Constante de volatilidad del sistema

const SCALE = 173.7178;

export function toGlicko2Scale(rating, rd) {
  return {
    mu: (rating - DEFAULT_RATING) / SCALE,
    phi: rd / SCALE
  };
}

export function fromGlicko2Scale(mu, phi) {
  return {
    rating: Math.round(mu * SCALE + DEFAULT_RATING),
    rd: Math.round(phi * SCALE)
  };
}

function g(phi) {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function E(mu, mu_j, phi_j) {
  return 1 / (1 + Math.exp(-g(phi_j) * (mu - mu_j)));
}

/**
 * Calcula el nuevo rating Glicko-2 para un jugador tras un partido
 * @param {Object} player - { rating, rd, volatility }
 * @param {Object} opponent - { rating, rd }
 * @param {number} score - 1 para victoria, 0 para derrota, 0.5 para empate
 * @returns {Object} { rating, rd, volatility, change }
 */
export function calculateGlicko2Match(player, opponent, score) {
  const p1 = toGlicko2Scale(player.rating || DEFAULT_RATING, player.rd || DEFAULT_RD);
  const p2 = toGlicko2Scale(opponent.rating || DEFAULT_RATING, opponent.rd || DEFAULT_RD);
  const sigma = player.volatility || DEFAULT_VOLATILITY;

  const g_j = g(p2.phi);
  const e_j = E(p1.mu, p2.mu, p2.phi);

  // Varianza estimada v
  const v = 1 / (g_j * g_j * e_j * (1 - e_j));

  // Delta estimado de mejora
  const delta = v * g_j * (score - e_j);

  // Actualización de volatilidad sigma' usando aproximación de Illinois/bisección
  const a = Math.log(sigma * sigma);
  const f = (x) => {
    const e_x = Math.exp(x);
    const d2 = delta * delta;
    const phi2 = p1.phi * p1.phi;
    const num1 = e_x * (d2 - phi2 - v - e_x);
    const den1 = 2 * Math.pow(phi2 + v + e_x, 2);
    const num2 = x - a;
    const den2 = TAU * TAU;
    return (num1 / den1) - (num2 / den2);
  };

  let A = a;
  let B;
  if (delta * delta > p1.phi * p1.phi + v) {
    B = Math.log(delta * delta - p1.phi * p1.phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) {
      k++;
    }
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);

  // Iteración
  while (Math.abs(B - A) > 0.000001) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }

  const newSigma = Math.exp(A / 2);

  // Nueva desviación estándar (phi*)
  const phiStar = Math.sqrt(p1.phi * p1.phi + newSigma * newSigma);

  // Nuevo phi' y mu'
  const newPhi = 1 / Math.sqrt((1 / (phiStar * phiStar)) + (1 / v));
  const newMu = p1.mu + newPhi * newPhi * g_j * (score - e_j);

  const converted = fromGlicko2Scale(newMu, newPhi);

  // Limitar RD mínimo y máximo
  const finalRd = Math.max(30, Math.min(350, converted.rd));
  const ratingChange = converted.rating - (player.rating || DEFAULT_RATING);

  return {
    rating: converted.rating,
    rd: finalRd,
    volatility: newSigma,
    ratingChange
  };
}

/**
 * Retorna el rating y RD inicial según el cuestionario de nivel autodeclarado
 */
export function getInitialGlicko(declaredLevel) {
  switch (declaredLevel) {
    case 'Principiante':
      return { rating: 1100, rd: 320, volatility: DEFAULT_VOLATILITY };
    case 'Intermedio':
      return { rating: 1400, rd: 300, volatility: DEFAULT_VOLATILITY };
    case 'Avanzado':
      return { rating: 1700, rd: 280, volatility: DEFAULT_VOLATILITY };
    case 'Competitivo':
      return { rating: 2000, rd: 260, volatility: DEFAULT_VOLATILITY };
    default:
      return { rating: 1350, rd: 350, volatility: DEFAULT_VOLATILITY };
  }
}
