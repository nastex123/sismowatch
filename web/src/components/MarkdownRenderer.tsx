import React, { useEffect, useState, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { BarChart2 } from 'lucide-react';

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

// Función para sanitizar y reparar sintaxis común en código Mermaid generado por LLMs
const sanitizeMermaidCode = (code: string): string => {
  if (!code) return '';
  let cleaned = code.trim();

  // Asegurar que las etiquetas con paréntesis, dos puntos o barras dentro de corchetes [ ... ] tengan comillas dobles
  cleaned = cleaned.replace(/([a-zA-Z0-9_-]+)\[([^\]"\n]+)\]/g, (_match, id, text) => {
    // Si ya tiene comillas o está vacío, no modificar
    const t = text.trim();
    if (t.startsWith('"') && t.endsWith('"')) return `${id}[${t}]`;
    // Escapar comillas internas si hubiera
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

    // Eliminar cualquier elemento de error insertado por Mermaid directamente en el DOM fuera de React
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
    const mermaidRegex = /```mermaid([\s\S]*?)```/g;
    const result: { type: 'markdown' | 'mermaid'; data: string; id: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mermaidRegex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        result.push({
          type: 'markdown',
          data: textBefore,
          id: `${idPrefix}-md-${lastIndex}`,
        });
      }

      result.push({
        type: 'mermaid',
        data: match[1].trim(),
        id: `${idPrefix}-mm-${match.index}`,
      });

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
