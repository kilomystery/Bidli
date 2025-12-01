/**
 * Hook per monitorare il numero di spettatori di una live in tempo reale
 * Collegato all'algoritmo di boost di BIDLi
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useViewerCount(liveId) {
  const [viewerCount, setViewerCount] = useState(0);
  const [totalViewers, setTotalViewers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef(null);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!liveId) return;

    let mounted = true;

    // Funzione per caricare stats iniziali
    const loadInitialStats = async () => {
      try {
        const response = await fetch(`/api/live/${liveId}/viewers`);
        if (response.ok) {
          const stats = await response.json();
          if (mounted) {
            setViewerCount(stats.current || 0);
            setTotalViewers(stats.total || 0);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.warn('⚠️ Errore caricamento stats spettatori:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Funzione per aggiornare periodicamente
    const updateStats = async () => {
      try {
        const response = await fetch(`/api/live/${liveId}/viewers`);
        if (response.ok) {
          const stats = await response.json();
          if (mounted) {
            setViewerCount(stats.current || 0);
            setTotalViewers(stats.total || 0);
          }
        }
      } catch (error) {
        console.warn('⚠️ Errore aggiornamento stats:', error);
      }
    };

    // Setup real-time subscription per aggiornamenti istantanei
    const setupRealtimeSubscription = () => {
      const channel = supabase
        .channel(`live-viewers-${liveId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'lives',
            filter: `id=eq.${liveId}`
          },
          (payload) => {
            if (mounted && payload.new) {
              console.log('📊 Aggiornamento real-time spettatori:', payload.new.viewers);
              setViewerCount(payload.new.viewers || 0);
              setTotalViewers(payload.new.total_viewers || 0);
            }
          }
        )
        .subscribe();

      subscriptionRef.current = channel;
    };

    // Inizializza
    loadInitialStats();
    setupRealtimeSubscription();

    // Polling di backup ogni 10 secondi
    intervalRef.current = setInterval(updateStats, 10000);

    // Cleanup
    return () => {
      mounted = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [liveId]);

  return {
    viewerCount,
    totalViewers,
    isLoading
  };
}

/**
 * Hook per formattare il numero di spettatori
 */
export function useFormattedViewerCount(count) {
  if (count < 1000) {
    return count.toString();
  } else if (count < 1000000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
}