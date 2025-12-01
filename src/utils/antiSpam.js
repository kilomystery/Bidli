// src/utils/antiSpam.js - Sistema anti-spam per algoritmo boost
import { supabase } from "../lib/supabaseClient";

/**
 * Limiti anti-spam per evitare abusi nel sistema boost
 */
const BOOST_LIMITS = {
  live: {
    maxBoosts: 3,
    timeWindow: 30 * 60 * 1000, // 30 minuti
    cooldown: 10 * 60 * 1000   // 10 minuti tra boost
  },
  post: {
    maxBoosts: 5,
    timeWindow: 2 * 60 * 60 * 1000, // 2 ore
    cooldown: 15 * 60 * 1000        // 15 minuti tra boost
  },
  profile: {
    maxBoosts: 1,
    timeWindow: 24 * 60 * 60 * 1000, // 24 ore
    cooldown: 24 * 60 * 60 * 1000    // 24 ore tra boost
  }
};

/**
 * Verifica se un utente può utilizzare un boost
 * @param {string} userId - ID dell'utente
 * @param {string} contentType - Tipo: 'live', 'post', 'profile'
 * @param {string} contentId - ID del contenuto da boostare
 * @returns {Promise<Object>} - Risultato verifica con dettagli
 */
export async function checkBoostLimits(userId, contentType, contentId) {
  try {
    const limits = BOOST_LIMITS[contentType];
    if (!limits) {
      return { allowed: false, reason: "Tipo contenuto non valido" };
    }

    const now = new Date();
    const timeWindowStart = new Date(now.getTime() - limits.timeWindow);

    // 1. Controlla boost recenti per questo tipo di contenuto
    const { data: recentBoosts, error } = await supabase
      .from("boost_campaigns")
      .select("created_at, content_id")
      .eq("user_id", userId)
      .eq("content_type", contentType)
      .gte("created_at", timeWindowStart.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 2. Controlla limite massimo boost nella finestra temporale
    if (recentBoosts.length >= limits.maxBoosts) {
      const oldestBoost = recentBoosts[recentBoosts.length - 1];
      const resetTime = new Date(new Date(oldestBoost.created_at).getTime() + limits.timeWindow);
      
      return {
        allowed: false,
        reason: `Limite raggiunto: massimo ${limits.maxBoosts} boost ogni ${formatTimeWindow(limits.timeWindow)}`,
        resetTime: resetTime,
        remaining: 0
      };
    }

    // 3. Controlla cooldown dall'ultimo boost
    if (recentBoosts.length > 0) {
      const lastBoost = recentBoosts[0];
      const lastBoostTime = new Date(lastBoost.created_at);
      const cooldownEnd = new Date(lastBoostTime.getTime() + limits.cooldown);
      
      if (now < cooldownEnd) {
        return {
          allowed: false,
          reason: `Cooldown attivo: ${formatTimeRemaining(cooldownEnd - now)} rimanenti`,
          resetTime: cooldownEnd,
          remaining: 0
        };
      }
    }

    // 4. Controlla se stesso contenuto già boostato recentemente
    const sameContentBoosts = recentBoosts.filter(b => b.content_id === contentId);
    if (sameContentBoosts.length > 0) {
      const lastSameContentBoost = sameContentBoosts[0];
      const minTimeBetweenSame = 60 * 60 * 1000; // 1 ora minimo tra boost dello stesso contenuto
      const nextAllowedTime = new Date(new Date(lastSameContentBoost.created_at).getTime() + minTimeBetweenSame);
      
      if (now < nextAllowedTime) {
        return {
          allowed: false,
          reason: `Contenuto già boostato: riprova tra ${formatTimeRemaining(nextAllowedTime - now)}`,
          resetTime: nextAllowedTime,
          remaining: 0
        };
      }
    }

    // 5. Tutto ok, calcola boost rimanenti
    const remaining = limits.maxBoosts - recentBoosts.length;
    
    return {
      allowed: true,
      remaining: remaining,
      resetTime: new Date(now.getTime() + limits.timeWindow),
      message: `✅ Boost disponibile (${remaining}/${limits.maxBoosts} rimanenti)`
    };

  } catch (error) {
    console.error("Errore verifica boost limits:", error);
    return {
      allowed: false,
      reason: "Errore sistema: riprova più tardi",
      remaining: 0
    };
  }
}

/**
 * Verifica limiti globali dell'utente per evitare spam generale
 */
export async function checkGlobalSpamLimits(userId) {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Controlla boost totali nelle ultime 24h
    const { data: dailyBoosts, error } = await supabase
      .from("boost_campaigns")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", last24h.toISOString());

    if (error) throw error;

    const maxDailyBoosts = 10; // Massimo 10 boost al giorno
    if (dailyBoosts.length >= maxDailyBoosts) {
      return {
        allowed: false,
        reason: `Limite giornaliero raggiunto: massimo ${maxDailyBoosts} boost ogni 24 ore`,
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      };
    }

    return {
      allowed: true,
      remaining: maxDailyBoosts - dailyBoosts.length
    };

  } catch (error) {
    console.error("Errore verifica limiti globali:", error);
    return { allowed: false, reason: "Errore sistema" };
  }
}

/**
 * Registra un boost utilizzato (per tracking)
 */
export async function recordBoostUsage(userId, contentType, contentId, multiplier, cost) {
  try {
    const { error } = await supabase
      .from("boost_campaigns")
      .insert({
        user_id: userId,
        content_type: contentType,
        content_id: contentId,
        boost_multiplier: multiplier,
        cost: cost,
        status: "active",
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };

  } catch (error) {
    console.error("Errore registrazione boost:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Formatta finestra temporale in modo user-friendly
 */
function formatTimeWindow(milliseconds) {
  const minutes = Math.floor(milliseconds / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  
  if (hours >= 24) {
    return `${Math.floor(hours / 24)} giorni`;
  } else if (hours >= 1) {
    return `${hours} ore`;
  } else {
    return `${minutes} minuti`;
  }
}

/**
 * Formatta tempo rimanente in modo user-friendly
 */
function formatTimeRemaining(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Ottieni statistiche boost per dashboard utente
 */
export async function getBoostStats(userId) {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: dailyBoosts } = await supabase
      .from("boost_campaigns")
      .select("id, cost")
      .eq("user_id", userId)
      .gte("created_at", last24h.toISOString());

    const { data: weeklyBoosts } = await supabase
      .from("boost_campaigns")
      .select("id, cost")
      .eq("user_id", userId)
      .gte("created_at", last7d.toISOString());

    const dailyCost = dailyBoosts?.reduce((sum, b) => sum + b.cost, 0) || 0;
    const weeklyCost = weeklyBoosts?.reduce((sum, b) => sum + b.cost, 0) || 0;

    return {
      daily: {
        count: dailyBoosts?.length || 0,
        cost: dailyCost,
        remaining: 10 - (dailyBoosts?.length || 0)
      },
      weekly: {
        count: weeklyBoosts?.length || 0,
        cost: weeklyCost
      }
    };

  } catch (error) {
    console.error("Errore caricamento statistiche boost:", error);
    return null;
  }
}