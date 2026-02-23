import { useState, useEffect, useRef } from 'react';
import { useGlobalChat } from '@/hooks/useGlobalChat';
import { CARD_SKINS } from '@/lib/cardSkins';
import { supabase } from '@/lib/supabase';

const ChatTerminal = () => {
  const { messages } = useGlobalChat();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setSending(true);

    // 1. Get the current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("❌ You are not logged in!");
      setSending(false);
      return;
    }

    // 2. Insert the message with the user_id
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        message: inputText,     // Your message text column
        user_id: user.id,       // <--- CRITICAL: You must send this!
        is_system: false        // (Optional) if you have this column
      });

    if (error) {
      console.error("❌ Error sending message:", error);
    } else {
      setInputText(""); // Clear input on success
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full min-h-[300px] border-t border-cyan-500/20 pt-2 mt-2">
      <div className="text-[10px] font-black text-cyan-500/50 uppercase tracking-[0.2em] mb-2 px-1">
        Hunter Net
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-2 pr-1 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-transparent">
        {messages.map((msg) => {
          // Fallback to default if no skin or skin not found
          const skinId = msg.profiles?.active_skin || 'default';
          const skin = CARD_SKINS[skinId as keyof typeof CARD_SKINS] || CARD_SKINS.default;

          return (
            <div
              key={msg.id}
              className={`p-2 rounded border relative overflow-hidden ${skin.style} ${skin.effect}`}
              style={skin?.backgroundImage ? { backgroundImage: `url(${skin.backgroundImage})`, backgroundSize: 'cover' } : {}}
            >
              {/* Optional: Dark overlay for readability if bg image exists */}
              {skin.backgroundImage && <div className="absolute inset-0 bg-black/60 z-0" />}

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  {msg.profiles?.avatar && (
                     <img src={msg.profiles.avatar} className="w-4 h-4 rounded-full border border-white/20" alt="avatar" />
                  )}
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                    {msg.profiles?.hunter_name || 'Unknown'}
                  </span>
                </div>
                <p className="text-xs text-white/90 leading-relaxed font-medium break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="relative mt-auto">
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Transmit..."
          disabled={sending}
          className="w-full bg-slate-900/60 border border-cyan-500/30 rounded px-3 py-2 text-xs text-white placeholder-cyan-500/30 focus:outline-none focus:border-cyan-500/60 transition-colors"
        />
      </form>
    </div>
  );
};

export default ChatTerminal;
