import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Cpu, Table, Trash2, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { apiService } from '../services/api';
import { ChatMessage } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatbotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHAT_STORAGE_KEY = 'sismowatch_chat_history';

const defaultWelcomeMessage: ChatMessage = {
  id: 'welcome',
  sender: 'assistant',
  text: '¡Hola! Soy el asistente analítico de SismoWatch impulsado por Gemini 3.5 Flash Lite. Puedo responder tus consultas sobre la actividad sísmica en tiempo real, generar tablas comparativas estructuradas y gráficas analíticas interactivas de barras y circulares a ultra-alta velocidad.',
  timestamp: new Date().toLocaleTimeString(),
  engine: 'Gemini 3.5 Flash Lite'
};

export const ChatbotDrawer: React.FC<ChatbotDrawerProps> = ({ isOpen, onClose }) => {
  const [provider, setProvider] = useState<'gemini' | 'opencode' | 'fallback'>('gemini');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignorar error de parsing
    }
    return [defaultWelcomeMessage];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persistir mensajes en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Falla al guardar historial de chat:', e);
    }
  }, [messages]);

  const handleClearHistory = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([defaultWelcomeMessage]);
  };

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
      const data = await apiService.sendChatMessage(text, provider);
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
    <div className="fixed bottom-4 right-4 z-[60] w-full max-w-lg sm:w-[480px] bg-black border border-zinc-900 rounded shadow-2xl flex flex-col h-[600px] overflow-hidden">
      {/* Header del Chat */}
      <div className="bg-zinc-950 p-3.5 border-b border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded border border-rose-500/40 bg-black flex items-center justify-center">
            <Bot className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-mono font-bold text-white tracking-wide uppercase">Asistente SismoWatch</h4>
              <span className="text-[10px] font-mono border-b border-rose-500/60 pb-0.5 text-rose-400">OpenCode + Gold</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">Consultas en Tiempo Real con Gráficas</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClearHistory}
            title="Limpiar Historial de Conversación"
            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-all press-action"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-white transition-all press-action"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selector de Modo de IA */}
      <div className="bg-zinc-950/80 px-3 py-2 border-b border-zinc-900 flex items-center justify-between text-xs font-mono">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Motor IA:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setProvider('gemini')}
            className={`py-0.5 text-[11px] transition-all press-action border-b-2 ${
              provider === 'gemini'
                ? 'border-rose-500 text-white font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Gemini 3.5 Lite (Default)
          </button>
          <button
            type="button"
            onClick={() => setProvider('opencode')}
            className={`py-0.5 text-[11px] transition-all press-action border-b-2 ${
              provider === 'opencode'
                ? 'border-rose-500 text-white font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            OpenCode
          </button>
          <button
            type="button"
            onClick={() => setProvider('fallback')}
            className={`py-0.5 text-[11px] transition-all press-action border-b-2 ${
              provider === 'fallback'
                ? 'border-rose-500 text-white font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Determinista
          </button>
        </div>
      </div>

      {/* Sugerencias Rápidas con Gráficas y Tablas */}
      <div className="bg-black px-3 py-2 border-b border-zinc-900 flex items-center gap-2 overflow-x-auto text-[11px] font-mono text-zinc-400">
        <button
          onClick={() => handleSend('Genera una tabla comparativa con los 5 sismos más fuertes registrados hoy')}
          className="whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-rose-300 hover:text-rose-200 transition-all press-action"
        >
          <Table className="w-3 h-3 text-rose-400" />
          Tabla Top Sismos
        </button>
        <button
          onClick={() => handleSend('¿Cuáles son los sismos más fuertes de hoy? Muestra una gráfica de barras')}
          className="whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 transition-all press-action"
        >
          <BarChart3 className="w-3 h-3 text-rose-400" />
          Top Sismos (Barras)
        </button>
        <button
          onClick={() => handleSend('Muestra la distribución de sismos por nivel de severidad en una gráfica circular')}
          className="whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 transition-all press-action"
        >
          <PieIcon className="w-3 h-3 text-rose-400" />
          Severidad (Circular)
        </button>
        <button
          onClick={() => handleSend('Compara la actividad de hoy con la de ayer y genera una gráfica de barras')}
          className="whitespace-nowrap px-2.5 py-1 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 transition-all press-action"
        >
          Comparativa Hoy vs Ayer
        </button>
      </div>

      {/* Área de Mensajes */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-black font-sans text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[92%] p-3 rounded text-xs ${
                msg.sender === 'user'
                  ? 'bg-zinc-900 text-white border border-zinc-800'
                  : 'bg-zinc-950 text-zinc-200 border-l-2 border-rose-500 border-t border-r border-b border-zinc-900'
              }`}
            >
              <MarkdownRenderer content={msg.text} idPrefix={msg.id} />

              {msg.engine && (
                <div className="mt-2.5 pt-1.5 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-rose-400" />
                    {msg.engine}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono p-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Consultando datos reales y generando diagrama con {provider}...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensaje */}
      <div className="p-3 bg-zinc-950 border-t border-zinc-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre sismos o solicita diagramas..."
            className="flex-1 bg-black border border-zinc-850 rounded px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white transition-all press-action"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
