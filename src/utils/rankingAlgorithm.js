// src/utils/rankingAlgorithm.js
// Algoritmo di ranking intelligente per vntg.live

/**
 * Calcola il punteggio base di un contenuto basato su metriche reali
 * @param {Object} content - Il contenuto (live, post, profilo)
 * @param {string} type - Tipo: 'live_stream', 'post', 'profile'
 * @returns {number} Punteggio base calcolato
 */
export function calculateBaseScore(content, type) {
  let baseScore = 0;
  
  switch (type) {
    case 'live_stream':
      baseScore = calculateLiveScore(content);
      break;
    case 'post':
      baseScore = calculatePostScore(content);
      break;
    case 'profile':
      baseScore = calculateProfileScore(content);
      break;
    default:
      baseScore = 100;
  }
  
  return Math.max(baseScore, 50); // Punteggio minimo di 50
}

/**
 * Calcola punteggio per live stream basato su engagement reale
 */
function calculateLiveScore(live) {
  const {
    viewer_count = 0,
    total_bids = 0,
    bid_amount_total = 0,
    duration_minutes = 0,
    likes = 0,
    comments = 0,
    shares = 0
  } = live;

  // Punteggio base: 500 punti + bonus per metriche
  let score = 500;
  
  // Bonus spettatori (massimo 500 punti)
  score += Math.min(viewer_count * 10, 500);
  
  // Bonus offerte (massimo 300 punti)
  score += Math.min(total_bids * 15, 300);
  
  // Bonus valore offerte (1 punto per euro)
  score += bid_amount_total;
  
  // Bonus durata live (1 punto per minuto, max 120)
  score += Math.min(duration_minutes, 120);
  
  // Bonus engagement
  score += likes * 2;
  score += comments * 3;
  score += shares * 5;
  
  return Math.round(score);
}

/**
 * Calcola punteggio per post basato su engagement
 */
function calculatePostScore(post) {
  const {
    likes = 0,
    comments = 0,
    shares = 0,
    views = 0,
    saves = 0,
    click_throughs = 0
  } = post;

  // Punteggio base: 200 punti + bonus per engagement
  let score = 200;
  
  // Bonus visualizzazioni (0.5 punti per view, max 200)
  score += Math.min(views * 0.5, 200);
  
  // Bonus interazioni
  score += likes * 3;
  score += comments * 5;
  score += shares * 8;
  score += saves * 4;
  score += click_throughs * 6;
  
  return Math.round(score);
}

/**
 * Calcola punteggio per profilo basato su credibilità
 */
function calculateProfileScore(profile) {
  const {
    followers = 0,
    total_sales = 0,
    avg_rating = 0,
    reviews_count = 0,
    profile_views = 0,
    days_active = 0
  } = profile;

  // Punteggio base: 100 punti + bonus per credibilità
  let score = 100;
  
  // Bonus follower (0.5 punti per follower, max 150)
  score += Math.min(followers * 0.5, 150);
  
  // Bonus vendite (5 punti per vendita, max 200)
  score += Math.min(total_sales * 5, 200);
  
  // Bonus rating (fino a 50 punti per rating perfetto)
  score += (avg_rating / 5) * 50;
  
  // Bonus recensioni (2 punti per recensione, max 100)
  score += Math.min(reviews_count * 2, 100);
  
  // Bonus visite profilo (0.2 punti per visita, max 100)
  score += Math.min(profile_views * 0.2, 100);
  
  // Bonus anzianità (1 punto per giorno attivo, max 365)
  score += Math.min(days_active, 365);
  
  return Math.round(score);
}

/**
 * Applica il moltiplicatore boost al punteggio base
 * @param {number} baseScore - Punteggio base calcolato
 * @param {number} boostMultiplier - Moltiplicatore boost (2, 5, 10)
 * @returns {number} Punteggio finale con boost
 */
export function applyBoost(baseScore, boostMultiplier = 1) {
  return Math.round(baseScore * boostMultiplier);
}

/**
 * Calcola ranking finale per ordinamento feed
 * @param {Object} content - Contenuto
 * @param {string} type - Tipo contenuto
 * @param {number} boostMultiplier - Moltiplicatore boost attivo
 * @returns {Object} Risultato con punteggi dettagliati
 */
export function calculateFinalRanking(content, type, boostMultiplier = 1) {
  const baseScore = calculateBaseScore(content, type);
  const boostedScore = applyBoost(baseScore, boostMultiplier);
  
  // Fattori aggiuntivi temporali
  const timeDecay = calculateTimeDecay(content.created_at);
  const finalScore = Math.round(boostedScore * timeDecay);
  
  return {
    baseScore,
    boostMultiplier,
    boostedScore,
    timeDecay,
    finalScore,
    type
  };
}

/**
 * Calcola decay temporale (contenuto più recente = punteggio più alto)
 */
function calculateTimeDecay(createdAt) {
  const now = new Date();
  const created = new Date(createdAt);
  const hoursAgo = (now - created) / (1000 * 60 * 60);
  
  // Decay graduale: 100% nelle prime 4 ore, poi degrada
  if (hoursAgo <= 4) return 1.0;
  if (hoursAgo <= 12) return 0.9;
  if (hoursAgo <= 24) return 0.8;
  if (hoursAgo <= 48) return 0.7;
  if (hoursAgo <= 72) return 0.6;
  return 0.5; // Minimo 50% anche per contenuti vecchi
}

/**
 * Confronta due contenuti per ordinamento (da usare con Array.sort)
 */
export function compareRankings(a, b) {
  const rankingA = calculateFinalRanking(a.content, a.type, a.boostMultiplier || 1);
  const rankingB = calculateFinalRanking(b.content, b.type, b.boostMultiplier || 1);
  
  return rankingB.finalScore - rankingA.finalScore; // Ordine decrescente
}

/**
 * Ottiene classifica completa con dettagli di ranking
 */
export function getRankingLeaderboard(contents) {
  return contents
    .map(item => ({
      ...item,
      ranking: calculateFinalRanking(item.content, item.type, item.boostMultiplier || 1)
    }))
    .sort((a, b) => b.ranking.finalScore - a.ranking.finalScore);
}