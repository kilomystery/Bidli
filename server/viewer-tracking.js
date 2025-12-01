/**
 * Sistema di tracking spettatori in tempo reale per BIDLi
 * Collegato all'algoritmo di boost e ranking
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

// Cache in memoria per tracking veloce
const viewersCache = new Map(); // liveId -> Set(viewerIds)
const cleanupTimers = new Map(); // viewerId -> timeoutId

/**
 * Aggiunge uno spettatore alla live
 */
async function addViewer(liveId, viewerId) {
  try {
    // 1. Aggiorna cache locale
    if (!viewersCache.has(liveId)) {
      viewersCache.set(liveId, new Set());
    }
    
    const viewers = viewersCache.get(liveId);
    const wasAlreadyWatching = viewers.has(viewerId);
    
    if (!wasAlreadyWatching) {
      viewers.add(viewerId);
      
      // 2. Aggiorna conteggio viewers e total_viewers
      const newCount = viewers.size;
      
      const { data, error } = await supabase
        .from('lives')
        .update({ 
          viewers: newCount
        })
        .eq('id', liveId)
        .select('viewers')
        .maybeSingle();
      
      if (error || !data) {
        console.warn(`⚠️ Live ${liveId} non trovata nel DB, mantengo solo cache locale`);
        console.warn('Errore DB:', error);
        return {
          success: true,
          viewers: newCount,
          totalViewers: newCount
        };
      }
      
      console.log(`📈 Spettatore aggiunto alla live ${liveId}: ${newCount} spettatori attuali`);
      
      // 3. Cleanup automatico dopo 5 minuti di inattività
      scheduleViewerCleanup(liveId, viewerId);
      
      return {
        success: true,
        viewers: newCount,
        totalViewers: 0 // Semplificato per ora
      };
    }
    
    // Rinnova cleanup timer se già presente
    scheduleViewerCleanup(liveId, viewerId);
    
    return {
      success: true,
      viewers: viewers.size,
      totalViewers: 0
    };
    
  } catch (error) {
    console.warn('⚠️ Errore aggiunta spettatore (non critico):', error.message);
    // Fallback: mantieni solo cache locale
    const viewers = viewersCache.get(liveId) || new Set();
    return { 
      success: true, 
      viewers: viewers.size,
      totalViewers: 0
    };
  }
}

/**
 * Rimuove uno spettatore dalla live
 */
async function removeViewer(liveId, viewerId) {
  try {
    const viewers = viewersCache.get(liveId);
    if (!viewers || !viewers.has(viewerId)) {
      return { success: true, viewers: viewers?.size || 0 };
    }
    
    // 1. Rimuovi da cache
    viewers.delete(viewerId);
    
    // 2. Cancella cleanup timer
    const timerId = cleanupTimers.get(`${liveId}-${viewerId}`);
    if (timerId) {
      clearTimeout(timerId);
      cleanupTimers.delete(`${liveId}-${viewerId}`);
    }
    
    // 3. Aggiorna database
    const newCount = viewers.size;
    
    const { data, error } = await supabase
      .from('lives')
      .update({ viewers: newCount })
      .eq('id', liveId)
      .select('viewers')
      .single();
    
    if (error) throw error;
    
    console.log(`📉 Spettatore rimosso dalla live ${liveId}: ${newCount} spettatori rimanenti`);
    
    // 4. Ricalcola score per algoritmo boost
    await updateLiveRanking(liveId, newCount);
    
    return {
      success: true,
      viewers: newCount
    };
    
  } catch (error) {
    console.error('❌ Errore rimozione spettatore:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Programma la rimozione automatica di uno spettatore dopo inattività
 */
function scheduleViewerCleanup(liveId, viewerId) {
  const key = `${liveId}-${viewerId}`;
  
  // Cancella timer esistente
  const existingTimer = cleanupTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  
  // Nuovo timer di 5 minuti
  const timer = setTimeout(async () => {
    console.log(`🧹 Cleanup automatico spettatore ${viewerId} dalla live ${liveId}`);
    await removeViewer(liveId, viewerId);
  }, 5 * 60 * 1000); // 5 minuti
  
  cleanupTimers.set(key, timer);
}

/**
 * Aggiorna il ranking della live nell'algoritmo boost
 */
async function updateLiveRanking(liveId, viewerCount) {
  try {
    // Carica dati live per calcolo score
    const { data: live, error } = await supabase
      .from('lives')
      .select('*')
      .eq('id', liveId)
      .single();
    
    if (error) throw error;
    
    // Calcola nuovo score usando l'algoritmo esistente
    const { calculateBaseScore, applyBoost } = await import('../src/utils/rankingAlgorithm.js');
    
    // Aggiungi viewer_count aggiornato
    const liveWithViewers = {
      ...live,
      viewer_count: viewerCount
    };
    
    const baseScore = calculateBaseScore(liveWithViewers, 'live_stream');
    
    // Controlla se ha boost attivi
    const { data: activeBoosts } = await supabase
      .from('boost_campaigns')
      .select('boost_multiplier, expires_at')
      .eq('content_type', 'live')
      .eq('content_id', liveId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());
    
    let finalScore = baseScore;
    if (activeBoosts && activeBoosts.length > 0) {
      const boost = activeBoosts[0];
      finalScore = applyBoost(baseScore, boost.boost_multiplier);
    }
    
    // Aggiorna ranking score nel database (se hai una tabella rankings)
    console.log(`🚀 Score aggiornato per live ${liveId}: ${finalScore} (${viewerCount} spettatori)`);
    
    return finalScore;
    
  } catch (error) {
    console.error('❌ Errore aggiornamento ranking:', error);
    return null;
  }
}

/**
 * Ottieni statistiche spettatori per una live
 */
async function getViewerStats(liveId) {
  try {
    const { data, error } = await supabase
      .from('lives')
      .select('viewers')
      .eq('id', liveId)
      .maybeSingle(); // CORREZIONE: usa maybeSingle() invece di single() per evitare errori su righe vuote
    
    // Se non c'è errore ma nemmeno dati, usa solo cache
    if (error && error.code !== 'PGRST116') {
      throw error; // Solo errori veri, non "no rows"
    }
    
    const current = viewersCache.get(liveId)?.size || 0;
    
    return {
      current: Math.max(current, data?.viewers || 0),
      total: 0, // Simplified for now to avoid DB errors
      cached: current
    };
    
  } catch (error) {
    // Solo logga se è un errore diverso da "no rows found"
    if (error.code !== 'PGRST116') {
      console.error('❌ Errore stats spettatori:', error);
    }
    return { current: 0, total: 0, cached: 0 };
  }
}

/**
 * Cleanup globale per live terminate
 */
async function cleanupLive(liveId) {
  console.log(`🧹 Cleanup completo live ${liveId}`);
  
  // Rimuovi tutti gli spettatori dalla cache
  const viewers = viewersCache.get(liveId);
  if (viewers) {
    for (const viewerId of viewers) {
      const key = `${liveId}-${viewerId}`;
      const timer = cleanupTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        cleanupTimers.delete(key);
      }
    }
    viewersCache.delete(liveId);
  }
  
  // Azzera contatori nel database
  await supabase
    .from('lives')
    .update({ viewers: 0 })
    .eq('id', liveId);
}

export {
  addViewer,
  removeViewer,
  getViewerStats,
  cleanupLive
};