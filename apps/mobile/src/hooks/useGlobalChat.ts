import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types/user';

export interface ChatMessage {
  id: string;
  created_at: string;
  content: string;
  username: string;
  user_id: string;
  avatar_url?: string | null;
  /** Minimal user for LayeredAvatar (id, name, avatar_url, cosmetics) */
  senderUser?: User | null;
}

export const useGlobalChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select(
          `
          id,
          created_at,
          content,
          user_id,
          profiles (
            id,
            hunter_name,
            avatar,
            cosmetics:user_cosmetics (
              id,
              equipped,
              shop_item_id,
              acquired_at,
              shop_items:shop_item_id (*)
            )
          )
        `
        )
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching chat messages:', error);
        setMessages([]);
      } else if (data) {
        const formattedMessages: ChatMessage[] = data.map((msg: any) => {
          const profile = msg.profiles;
          const cosmetics = (profile?.cosmetics || []).map((c: any) => ({
            id: c.id,
            user_id: profile?.id ?? msg.user_id,
            shop_item_id: c.shop_item_id,
            equipped: c.equipped,
            created_at: c.acquired_at ?? c.created_at ?? new Date().toISOString(),
            shop_items: c.shop_items ?? {},
          }));
          const senderUser: User | null = profile
            ? {
                id: profile.id ?? msg.user_id,
                name: profile.hunter_name ?? 'Hunter',
                hunter_name: profile.hunter_name,
                email: '',
                level: 1,
                exp: 0,
                submittedIds: [],
                slotsUsed: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                avatar_url: profile.avatar ?? undefined,
                cosmetics,
              } as User
            : null;
          return {
            id: msg.id,
            created_at: msg.created_at,
            content: msg.content,
            user_id: msg.user_id,
            username: profile?.hunter_name ?? 'Unknown',
            avatar_url: profile?.avatar ?? null,
            senderUser,
          };
        });
        setMessages(formattedMessages);
      }
      setLoading(false);
    };

    fetchMessages();

    const channel = supabase
      .channel('public:chat_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const newMessageId = payload.new?.id;
          if (!newMessageId) return;
          const { data, error } = await supabase
            .from('chat_messages')
            .select(
              `
              id,
              created_at,
              content,
              user_id,
              profiles (
                id,
                hunter_name,
                avatar,
                cosmetics:user_cosmetics (
                  id,
                  equipped,
                  shop_item_id,
                  acquired_at,
                  shop_items:shop_item_id (*)
                )
              )
            `
            )
            .eq('id', newMessageId)
            .single();

          if (error) {
            console.error('Error fetching new message profile:', error);
            return;
          }
          if (data) {
            const profile = data.profiles;
            const cosmetics = (profile?.cosmetics || []).map((c: any) => ({
              id: c.id,
              user_id: profile?.id ?? data.user_id,
              shop_item_id: c.shop_item_id,
              equipped: c.equipped,
              created_at: c.acquired_at ?? c.created_at ?? new Date().toISOString(),
              shop_items: c.shop_items ?? {},
            }));
            const senderUser: User | null = profile
              ? ({
                  id: profile.id ?? data.user_id,
                  name: profile.hunter_name ?? 'Hunter',
                  hunter_name: profile.hunter_name,
                  email: '',
                  level: 1,
                  exp: 0,
                  submittedIds: [],
                  slotsUsed: 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  avatar_url: profile.avatar ?? undefined,
                  cosmetics,
                } as User)
              : null;
            const formattedMessage: ChatMessage = {
              id: data.id,
              created_at: data.created_at,
              content: data.content,
              user_id: data.user_id,
              username: profile?.hunter_name ?? 'Unknown',
              avatar_url: profile?.avatar ?? null,
              senderUser,
            };
            setMessages((prev) => [...prev, formattedMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user) return false;
    const { error } = await supabase.from('chat_messages').insert({
      content: content.trim(),
      user_id: user.id,
    });
    if (error) {
      console.error('Error sending message:', error);
      return false;
    }
    return true;
  };

  return { messages, loading, sendMessage };
};
