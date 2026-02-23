import React, { useState, useRef, useEffect } from 'react';
import { useGlobalChat } from '@/hooks/useGlobalChat';
import { supabase } from '@/lib/supabase';
import { CARD_SKINS } from '@/lib/cardSkins';
import LayeredAvatar from './LayeredAvatar';

export const GlobalTerminal = ({ userProfile }: any) => {
  const { messages } = useGlobalChat();
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // We assume userProfile has the ID. If not, we might need to get it from auth.
    // userProfile is the 'user' object from useHunterData.
    // The 'user' object might not have 'id' at top level if it's the custom User type?
    // Let's check user.id in app/page.tsx. It seems to be used as user.id.
    
    // Ensure we have a user ID
    const userId = userProfile.id || (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
        console.error("No user ID found for chat");
        return;
    }

    const { error } = await supabase
      .from('chat_messages')
      .insert([
        { 
          user_id: userId, 
          content: newMessage.trim() 
        }
      ]);

    if (!error) setNewMessage('');
    else console.error("Error sending message:", error);
  };

  return (
    <div className="flex flex-col h-full bg-black/20 backdrop-blur-md border-l border-white/5 min-h-[200px]">
      
      {/* 1. MESSAGE FEED */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
      >
        {messages.map((msg: any) => {
            // Logic to determine the frame/skin
            const skinId = msg.profiles?.active_skin || 'default';
            const skin = CARD_SKINS[skinId as keyof typeof CARD_SKINS] || CARD_SKINS.default;
            const bgImage = skin.backgroundImage; // e.g. '/skins/galaxy_bg.jpg'
            
            return (
              <div key={msg.id} className="relative group min-h-[3rem]">
                {/* Calling Card Overlay (Background Image or Style) */}
                <div 
                    className={`absolute inset-0 z-0 opacity-30 rounded-md pointer-events-none ${!bgImage ? skin.style : ''}`}
                    style={bgImage ? { 
                      backgroundImage: `url(${bgImage})`,
                      backgroundSize: 'cover'
                    } : {}}
                />

                <div className="relative z-10 flex items-start gap-2 p-2">
                  <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden flex-shrink-0 bg-slate-900 shadow-inner">
                    <LayeredAvatar 
                      user={{
                        name: msg.profiles?.hunter_name || 'Hunter',
                        avatar_url: msg.profiles?.avatar,
                        base_body_url: msg.profiles?.base_body_url,
                        gender: msg.profiles?.gender,
                        cosmetics: msg.profiles?.cosmetics || []
                      } as any} 
                      size={32}
                      hideBackground={true}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black italic uppercase text-blue-400 tracking-tighter">
                      {msg.profiles?.hunter_name || 'Unknown'}
                    </span>
                    <p className="text-gray-200 text-xs leading-tight break-all">
                      {msg.content}
                    </p>
                  </div>
                </div>
              </div>
            );
        })}
      </div>

      {/* 2. INPUT AREA */}
      <form onSubmit={handleSendMessage} className="p-4 bg-black/40 border-t border-white/5">
        <div className="relative flex items-center">
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="CHAT NOW..."
            className="w-full bg-gray-950/80 border border-gray-800 rounded px-3 py-2 text-[10px] text-white focus:outline-none focus:border-blue-500/50 italic font-bold"
          />
          <button 
            type="submit"
            className="absolute right-2 text-blue-500 hover:text-blue-400 font-black italic text-[10px]"
          >
            SEND
          </button>
        </div>
      </form>

    </div>
  );
};
