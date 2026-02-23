import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const useGlobalChat = () => {
  const [messages, setMessages] = useState<any[]>([]);

  const fetchLatest = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select(`
        id, content, created_at,
        profiles (
          hunter_name, 
          avatar, 
          active_skin,
          base_body_url,
          gender,
          cosmetics:user_cosmetics(
            id, 
            equipped, 
            shop_items(*)
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      // Filter for only equipped cosmetics to keep it light
      const processed = data.map((msg: any) => {
        if (msg.profiles?.cosmetics) {
          msg.profiles.cosmetics = msg.profiles.cosmetics.filter((c: any) => c.equipped);
        }
        return msg;
      });
      setMessages(processed.reverse());
    }
  };

  useEffect(() => {
    fetchLatest();

    // Listen for new chat entries
    const channel = supabase.channel('terminal_sync')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public',
          table: 'chat_messages' 
        }, () => {
        fetchLatest();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { messages };
};
