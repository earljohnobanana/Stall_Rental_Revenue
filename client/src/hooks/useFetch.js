import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

export function useFetch(url, config = {}, deps = []) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const mountedRef             = useRef(true);

  const fetchData = useCallback(async () => {
    if (!url) return;
    setLoading(true); setError(null);
    try {
      const res = await api.get(url, config);
      if (mountedRef.current) setData(res.data);
    } catch (err) {
      if (err?.canceled) return;
      if (mountedRef.current) setError(err.response?.data?.message || err.message || 'Failed to load.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [url, JSON.stringify(config), ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useSubmit() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const submit = async (method, url, data = null) => {
    setLoading(true); setError('');
    try {
      const res = await api[method](url, data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'An error occurred.';
      setError(msg); throw err;
    } finally { setLoading(false); }
  };
  return { submit, loading, error, setError };
}