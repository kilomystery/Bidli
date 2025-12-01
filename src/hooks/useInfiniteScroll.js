// src/hooks/useInfiniteScroll.js
// Hook per implementare infinite scroll con performance ottimizzate

import { useState, useEffect, useCallback, useRef } from 'react';

export const useInfiniteScroll = (options = {}) => {
  const {
    threshold = 200, // Pixel dal fondo per triggerare caricamento
    rootMargin = '0px',
    enabled = true,
    hasNextPage = true,
    isFetching = false
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef();

  const intersectionCallback = useCallback((entries) => {
    const [entry] = entries;
    if (entry.isIntersecting && enabled && hasNextPage && !isFetching) {
      setIsIntersecting(true);
    } else {
      setIsIntersecting(false);
    }
  }, [enabled, hasNextPage, isFetching]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(intersectionCallback, {
      rootMargin,
      threshold: 0.1
    });

    observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [intersectionCallback, rootMargin]);

  return { targetRef, isIntersecting };
};

export const useInfiniteSearch = (searchFunction, options = {}) => {
  const {
    pageSize = 20,
    cacheKey = '',
    debounceMs = 300
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  
  const abortControllerRef = useRef();
  const debounceTimeoutRef = useRef();

  // Reset when query changes
  const handleQueryChange = useCallback((newQuery) => {
    // Clear existing debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setQuery(newQuery);
      setData([]);
      setPage(1);
      setHasNextPage(true);
      setError(null);
    }, debounceMs);
  }, [debounceMs]);

  // Load next page
  const loadMore = useCallback(async () => {
    if (loading || !hasNextPage || !query) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await searchFunction({
        query,
        page,
        pageSize,
        signal: abortControllerRef.current.signal
      });

      if (result.data) {
        setData(prevData => page === 1 ? result.data : [...prevData, ...result.data]);
        setHasNextPage(result.data.length === pageSize && result.hasMore !== false);
        setPage(prevPage => prevPage + 1);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Errore durante il caricamento');
      }
    } finally {
      setLoading(false);
    }
  }, [searchFunction, query, page, pageSize, loading, hasNextPage]);

  // Load more when intersecting
  const { targetRef, isIntersecting } = useInfiniteScroll({
    enabled: true,
    hasNextPage,
    isFetching: loading
  });

  useEffect(() => {
    if (isIntersecting && query) {
      loadMore();
    }
  }, [isIntersecting, loadMore, query]);

  // Initial load when query changes
  useEffect(() => {
    if (query && page === 1) {
      loadMore();
    }
  }, [query]); // Only trigger on query change

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasNextPage(true);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    hasNextPage,
    targetRef,
    handleQueryChange,
    loadMore,
    reset,
    currentPage: page - 1
  };
};