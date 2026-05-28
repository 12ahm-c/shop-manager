import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { aiApi } from '../api/ai';
import { socketService } from '../lib/socket';

export default function AiChatScreen() {
  const { t } = useTranslation();
  
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: t('ai.welcome', 'Hello! How can I help you manage your store today?') }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Fetch initial suggestions
    aiApi.getSuggestions().then(res => {
      if (res.success) {
        setSuggestions(res.data?.suggestions || []);
      }
    });

    // Listen for streaming responses via Socket.IO
    const handleAiResponse = (data) => {
      setMessages(prev => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          lastMsg.content += data.chunk || '';
          if (data.done) lastMsg.isStreaming = false;
        } else if (data.message) {
           newMsgs.push({ id: Date.now(), role: 'assistant', content: data.message });
        }
        return newMsgs;
      });
      if (data.done || data.message) setLoading(false);
    };

    socketService.subscribe('ai:response', handleAiResponse);

    return () => {
      socketService.unsubscribe('ai:response', handleAiResponse);
    };
  }, []);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    
    // Add user message
    const newMsgs = [...messages, { id: crypto.randomUUID(), role: 'user', content: text }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);
    setSuggestions([]); // Clear suggestions after a question

    try {
      const res = await aiApi.chat(text);
      if (res.success && res.data?.response) {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: res.data.response }]);
        setLoading(false);
      } else if (res.success && res.data?.isStreaming) {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: '', isStreaming: true }]);
      } else if (!res.success) {
        throw new Error(res.error?.message);
      }
    } catch {
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'system', 
        content: t('ai.error', 'Sorry, I encountered an error. Please try again.') 
      }]);
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          {t('ai.title', 'AI Assistant')}
        </h2>
        <p className="text-muted-foreground">{t('ai.subtitle', 'Ask questions about your sales, stock, and customers.')}</p>
      </div>

      <div className="flex-1 bg-card border rounded-t-xl overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[80%] p-4 rounded-xl ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-br-sm' 
                  : msg.role === 'system'
                    ? 'bg-destructive/10 text-destructive text-sm'
                    : 'bg-secondary text-secondary-foreground rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              {msg.isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-current animate-pulse align-middle" />}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-card border-x border-b rounded-b-xl p-4">
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('ai.inputPlaceholder', 'Type your question here...')}
            className="flex-1 px-4 py-3 bg-background border rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
