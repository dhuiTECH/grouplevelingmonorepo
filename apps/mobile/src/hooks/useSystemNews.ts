import { useState, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

export function useSystemNews() {
  const [systemNews, setSystemNews] = useState<any[]>([]);
  const [navigationTarget, setNavigationTarget] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('global_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      if (data) setSystemNews(data);
    };
    fetchHistory();

    const channel = supabase
      .channel('world-news')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_notifications' }, (payload) => {
        setSystemNews(prev => [payload.new, ...prev].slice(0, 3));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleNewsTap = useCallback((news: any) => {
    const coords = news.coordinates.replace(/[\[\]]/g, '').split(', ');
    setNavigationTarget({ x: parseInt(coords[0], 10), y: parseInt(coords[1], 10) });
    setTimeout(() => setNavigationTarget(null), 10000);
  }, []);

  return { systemNews, setSystemNews, navigationTarget, setNavigationTarget, handleNewsTap };
}
