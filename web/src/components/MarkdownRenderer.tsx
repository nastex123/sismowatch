import React, { useEffect, useState, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { BarChart3, PieChart as PieIcon, BarChart2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  idPrefix?: string;
}

// Configurar marked con soporte completo GFM
marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
});

const PALETTE = ['#f43f5e', '#fda4af', '#fb7185', '#e11d48', '#be123c', '#71717a', '#3f3f46', '#a1a1aa'];

interface ChartItem {
  label: string;
  value: number;
  color?: string;
}

interface ChartPayload {
  type: 'bar' | 'pie' | 'circular' | 'donut';
  title?: string;
  data: ChartItem[];
}

// Subcomponente interactivo para Gráficas Analíticas (Barras y Circulares)
const ChatChartBlock: React.FC<{ raw: string; id: string }> = ({ raw }) => {
  const chartPayload = useMemo<ChartPayload | null>(() => {
    const text = raw.trim();

    // 1. Intentar parsear como JSON directo
    try {
      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.data)) {
        return {
          type: (parsed.type || 'bar').toLowerCase(),
          title: parsed.title || '',
          data: parsed.data.map((d: any) => ({
            label: String(d.label || d.name || ''),
            value: Number(d.value ?? d.count ?? 0),
            color: d.color
          }))
        };
      }
    } catch {
      // Continuar a otros parsers
    }

    // 2. Intentar parsear Mermaid "pie title ..."
    if (text.startsWith('pie')) {
      const lines = text.split('\n');
      let title = '';
      const data: ChartItem[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('pie title')) {
          title = trimmed.replace('pie title', '').trim();
        } else if (trimmed.includes(':')) {
          const [lbl, valStr] = trimmed.split(':');
          const cleanLabel = lbl.replace(/["']/g, '').trim();
          const cleanVal = parseFloat(valStr.trim());
          if (cleanLabel && !isNaN(cleanVal)) {
            data.push({ label: cleanLabel, value: cleanVal });
          }
        }
      }
      if (data.length > 0) {
        return { type: 'pie', title: title || 'Distribución Sísmica', data };
      }
    }

    return null;
  }, [raw]);

  if (!chartPayload || chartPayload.data.length === 0) {
    return (
      <div className="my-3 p-3 rounded bg-zinc-950 border border-zinc-850 font-mono text-[11px] text-zinc-300 overflow-x-auto shadow-inner">
        <span className="text-[10px] text-rose-400 font-bold mb-1 uppercase tracking-wider block font-mono">
          Datos de Gráfica
        </span>
        <pre className="text-zinc-400 whitespace-pre text-[10px] font-mono leading-tight">{raw}</pre>
      </div>
    );
  }

  const isPie = chartPayload.type === 'pie' || chartPayload.type === 'circular' || chartPayload.type === 'donut';

  if (isPie) {
    return (
      <div className="my-3 p-3.5 rounded bg-zinc-950 border border-zinc-850 shadow-inner flex flex-col">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-rose-400 mb-2 border-b border-zinc-900 pb-1.5">
          <span className="flex items-center gap-1.5">
            <PieIcon className="w-3.5 h-3.5" />
            {chartPayload.title || 'Gráfica Circular de Distribución'}
          </span>
          <span className="text-[10px] text-zinc-500 font-normal">Proporción Sísmica</span>
        </div>
        <div className="h-48 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartPayload.data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={65}
                paddingAngle={3}
                stroke="#09090b"
                strokeWidth={2}
              >
                {chartPayload.data.map((entry, index) => (
                  <Cell key={`pie-${index}`} fill={entry.color || PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#09090b',
                  borderColor: '#27272a',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#f4f4f5',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.7)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2.5 border-t border-zinc-900 text-[10px] font-mono text-zinc-400">
          {chartPayload.data.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || PALETTE[idx % PALETTE.length] }} />
              <span>{entry.label}: <strong className="text-white">{entry.value}</strong></span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Gráfica de Barras por defecto
  return (
    <div className="my-3 p-3.5 rounded bg-zinc-950 border border-zinc-850 shadow-inner flex flex-col">
      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-rose-400 mb-2 border-b border-zinc-900 pb-1.5">
        <span className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" />
          {chartPayload.title || 'Gráfica Comparativa de Barras'}
        </span>
        <span className="text-[10px] text-zinc-500 font-normal">Analítica Capa Gold</span>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartPayload.data} margin={{ top: 8, right: 8, left: -22, bottom: 20 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#18181b" />
            <XAxis
              dataKey="label"
              stroke="#71717a"
              tick={{ fontSize: 9, fill: '#a1a1aa' }}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis stroke="#71717a" tick={{ fontSize: 9, fill: '#a1a1aa' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#09090b',
                borderColor: '#27272a',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#f4f4f5',
                boxShadow: '0 4px 12px rgba(0,0,0,0.7)'
              }}
            />
            <Bar dataKey="value" name="Valor" radius={[2, 2, 0, 0]}>
              {chartPayload.data.map((entry, index) => (
                <Cell key={`bar-${index}`} fill={entry.color || PALETTE[index % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Función para sanitizar y reparar sintaxis común en código Mermaid generado por LLMs
const sanitizeMermaidCode = (code: string): string => {
  if (!code) return '';
  let cleaned = code.trim();

  cleaned = cleaned.replace(/([a-zA-Z0-9_-]+)\[([^\]"\n]+)\]/g, (_match, id, text) => {
    const t = text.trim();
    if (t.startsWith('"') && t.endsWith('"')) return `${id}[${t}]`;
    const escaped = t.replace(/"/g, "'");
    return `${id}["${escaped}"]`;
  });

  return cleaned;
};

// Subcomponente interactivo para diagramas Mermaid
const MermaidBlock: React.FC<{ chart: string; id: string }> = ({ chart, id }) => {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const cleanupMermaidArtifacts = () => {
      try {
        document.querySelectorAll('[id^="dmermaid"], [id*="mermaid-error"]').forEach((node) => {
          if (node.parentElement === document.body) {
            node.remove();
          }
        });
      } catch {
        // Ignorar
      }
    };

    const renderDiagram = async () => {
      const mermaid = (window as any).mermaid;
      if (!mermaid) {
        setTimeout(renderDiagram, 300);
        return;
      }
      try {
        cleanupMermaidArtifacts();

        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: 'dark',
          themeVariables: {
            darkMode: true,
            background: '#09090b',
            primaryColor: '#e11d48',
            primaryTextColor: '#f4f4f5',
            primaryBorderColor: '#be123c',
            lineColor: '#f43f5e',
            secondaryColor: '#18181b',
            tertiaryColor: '#27272a'
          }
        });

        const cleanChart = sanitizeMermaidCode(chart);
        const elementId = `mermaid-chart-${id.replace(/[^a-zA-Z0-9]/g, '')}-${Math.floor(Math.random() * 100000)}`;
        const { svg } = await mermaid.render(elementId, cleanChart);
        
        cleanupMermaidArtifacts();

        if (isMounted) {
          setSvgHtml(svg);
          setRenderError(false);
        }
      } catch (err) {
        console.warn('Error al procesar diagrama Mermaid:', err);
        cleanupMermaidArtifacts();
        if (isMounted) {
          setRenderError(true);
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
      cleanupMermaidArtifacts();
    };
  }, [chart, id]);

  if (renderError || !svgHtml) {
    return (
      <div className="my-3 p-3 rounded bg-zinc-950 border border-zinc-850 font-mono text-[11px] text-zinc-300 overflow-x-auto shadow-inner">
        <div className="flex items-center justify-between text-[10px] text-rose-400 font-bold mb-1.5 uppercase tracking-wider font-mono">
          <span className="flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            Diagrama Analítico Mermaid
          </span>
          {!svgHtml && !renderError && <span className="text-zinc-500 animate-pulse font-mono">Renderizando...</span>}
        </div>
        <pre className="text-zinc-400 whitespace-pre text-[10px] font-mono leading-tight">{chart}</pre>
      </div>
    );
  }

  return (
    <div className="my-3 p-3 rounded bg-zinc-950 border border-zinc-850 overflow-x-auto flex flex-col shadow-inner">
      <div className="w-full flex items-center justify-between text-[10px] text-rose-400 font-mono font-bold mb-2 border-b border-zinc-900 pb-1.5">
        <span className="flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5" />
          Diagrama Analítico en Tiempo Real
        </span>
      </div>
      <div
        className="w-full flex justify-center py-2 [&>svg]:max-w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '', idPrefix = 'md' }) => {
  const parts = useMemo(() => {
    if (!content) return [];
    // Capturar bloques de gráficas interactivas (```chart / ```chart-bar / ```chart-pie) y Mermaid
    const blockRegex = /```(chart|chart-bar|chart-pie|mermaid)([\s\S]*?)```/g;
    const result: { type: 'markdown' | 'chart' | 'mermaid'; data: string; id: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        result.push({
          type: 'markdown',
          data: textBefore,
          id: `${idPrefix}-md-${lastIndex}`,
        });
      }

      const blockType = match[1];
      const blockBody = match[2].trim();

      if (blockType.startsWith('chart') || blockBody.startsWith('pie')) {
        result.push({
          type: 'chart',
          data: blockBody,
          id: `${idPrefix}-ch-${match.index}`,
        });
      } else {
        result.push({
          type: 'mermaid',
          data: blockBody,
          id: `${idPrefix}-mm-${match.index}`,
        });
      }

      lastIndex = match.index + match[0].length;
    }

    const remainingText = content.substring(lastIndex);
    if (remainingText.trim()) {
      result.push({
        type: 'markdown',
        data: remainingText,
        id: `${idPrefix}-md-${lastIndex}`,
      });
    }

    return result;
  }, [content, idPrefix]);

  return (
    <div className={`space-y-2 ${className}`}>
      {parts.map((part) => {
        if (part.type === 'chart') {
          return <ChatChartBlock key={part.id} raw={part.data} id={part.id} />;
        }

        if (part.type === 'mermaid') {
          return <MermaidBlock key={part.id} chart={part.data} id={part.id} />;
        }

        // Procesamiento con marked para tablas GFM y formato rico
        const rawHtml = marked.parse(part.data) as string;
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
          ADD_ATTR: ['target', 'rel'],
        });

        return (
          <div
            key={part.id}
            className="sismo-markdown leading-relaxed"
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
          />
        );
      })}
    </div>
  );
};
