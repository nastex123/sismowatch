import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, Database, MessageSquare, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';
import { ChatMessage } from '../types';

interface ChatbotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatbotDrawer: React.FC<ChatbotDrawerProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '¡Hola! Soy el asistente analítico de SismoWatch. Puedo responder preguntas sobre la actividad sísmica global y estadísticas consultando directamente la capa Gold.',
      timestamp: new Date().toLocaleTimeString(),
      engine: 'SismoWatch Intelligence'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await apiService.sendChatMessage(text);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString(),
        engine: data.engine,
        gold_reference: data.gold_reference
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Lo siento, no pude procesar la consulta en la capa Gold: ${err.message}`,
        timestamp: new Date().toLocaleTimeString(),
        engine: 'Error'
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md sm:w-[420px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col h-[560px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header del Chat */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide">Asistente SismoWatch</h4>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">Gold Layer</span>
            </div>
            <p className="text-[11px] text-slate-400">OpenCode CLI / Gemini / SQL Read-Only</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sugerencias Rápidas */}
      <div className="bg-slate-950/60 px-3 py-2 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] font-medium text-slate-300">
        <button
          onClick={() => handleSend('¿Cuáles fueron los sismos más fuertes de hoy?')}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-colors"
        >
          Sismos más fuertes
        </button>
        <button
          onClick={() => handleSend('¿Hay alguna alerta de tsunami activa?')}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-colors"
        >
          Alertas de Tsunami
        </button>
        <button
          onClick={() => handleSend('¿Cuál es el resumen de las últimas 24 horas?')}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-colors"
        >
          Resumen 24h
        </button>
      </div>

      {/* Lista de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-xs'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-xs'
              }`}
            >
              {msg.text}

              {/* Referencia a Gold */}
              {msg.gold_reference && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono flex items-center gap-2">
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span>24h: {msg.gold_reference.events_24h} | Máx: {msg.gold_reference.max_magnitude}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono px-1">
              <span>{msg.timestamp}</span>
              {msg.engine && <span className="text-slate-400">({msg.engine})</span>}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 w-fit">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>Consultando datos en Gold...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulario de Entrada */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu consulta sobre la capa Gold..."
          disabled={loading}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
