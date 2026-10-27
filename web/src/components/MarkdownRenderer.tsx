import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BarChart2, Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  idPrefix?: string;
}

// Subcomponente interactivo para diagramas Mermaid
const MermaidBlock: React.FC<{ chart: string; id: string }> = ({ chart, id }) => {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      const mermaid = (window as any).mermaid;
      if (!mermaid) {
        setTimeout(renderDiagram, 300);
        return;
      }
      try {
        mermaid.initialize({
          startOnLoad: false,
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
        const cleanChart = chart.trim();
        const elementId = `mermaid-chart-${id.replace(/[^a-zA-Z0-9]/g, '')}-${Math.floor(Math.random() * 100000)}`;
        const { svg } = await mermaid.render(elementId, cleanChart);
        if (isMounted) {
          setSvgHtml(svg);
          setRenderError(false);
        }
      } catch (err) {
        console.warn('Error al procesar diagrama Mermaid:', err);
        if (isMounted) {
          setRenderError(true);
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
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

// Componente para bloques de código con botón de copiar
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded border border-zinc-850 bg-black overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-950 border-b border-zinc-850 text-[10px] text-zinc-400">
        <span className="uppercase text-rose-400 font-bold tracking-wider">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors press-action"
          title="Copiar código"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-zinc-400" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-zinc-300 text-[11px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '', idPrefix = 'md' }) => {
  // Asegurar que las tablas Markdown tengan saltos de línea previos y posteriores para que remarkGfm siempre las reconozca
  const normalizedContent = (content || '')
    .replace(/([^\n])\n(\|[^\n]+\|)/g, '$1\n\n$2')
    .replace(/(\|[^\n]+\|)\n([^\n|])/g, '$1\n\n$2');

  return (
    <div className={`markdown-body text-xs leading-relaxed text-zinc-200 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Tablas con estilo minimalista negro, zinc y acentos rosa
          table: ({ node, ...props }) => (
            <div className="my-3 overflow-x-auto rounded border border-zinc-850 bg-black">
              <table className="w-full text-left border-collapse text-xs" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-zinc-950 border-b border-zinc-800 font-mono text-[11px] text-rose-400 uppercase tracking-wider" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-zinc-900/80 font-sans" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-zinc-900/40 transition-colors" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-3 py-2 font-mono font-bold text-rose-400 text-[10px] uppercase border-r border-zinc-900 last:border-r-0" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3 py-2 text-zinc-300 text-[11px] border-r border-zinc-900/60 last:border-r-0 font-sans" {...props} />
          ),

          // Títulos estructurados
          h1: ({ node, ...props }) => (
            <h1 className="text-sm font-mono font-bold text-white border-b border-zinc-850 pb-1.5 mt-4 mb-2 first:mt-0 tracking-wide uppercase" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xs font-mono font-bold text-rose-300 mt-3.5 mb-1.5 first:mt-0 uppercase tracking-wider" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs font-mono font-semibold text-zinc-200 mt-2.5 mb-1 first:mt-0" {...props} />
          ),

          // Párrafos
          p: ({ node, ...props }) => (
            <p className="my-1.5 leading-relaxed text-zinc-300 last:mb-0" {...props} />
          ),

          // Listas
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-1 my-2 text-zinc-300 pl-1 text-[11px]" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 text-zinc-300 pl-1 text-[11px] font-mono" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-zinc-300 leading-relaxed" {...props} />
          ),

          // Bloque de citas
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-2 border-rose-500 bg-zinc-950/80 px-3 py-1.5 my-2.5 text-zinc-400 italic text-[11px] rounded-r" {...props} />
          ),

          // Bloques de código y Mermaid
          code: ({ node, className: codeClassName, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const lang = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (lang === 'mermaid') {
              const chartId = `${idPrefix}-${Math.random().toString(36).substring(2, 8)}`;
              return <MermaidBlock chart={codeString} id={chartId} />;
            }

            // Si es multilínea o tiene clase de lenguaje, renderizar CodeBlock
            if (codeClassName || codeString.includes('\n')) {
              return <CodeBlock code={codeString} language={lang} />;
            }

            // Código inline
            return (
              <code className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-rose-300 font-mono text-[10px]" {...props}>
                {children}
              </code>
            );
          },

          // Énfasis
          strong: ({ node, ...props }) => (
            <strong className="text-white font-bold" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="text-zinc-300 italic" {...props} />
          ),

          // Enlaces
          a: ({ node, ...props }) => (
            <a className="text-rose-400 hover:text-rose-300 underline font-mono text-xs transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
          ),

          // Divisores horizontales
          hr: ({ node, ...props }) => (
            <hr className="my-3 border-zinc-850" {...props} />
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};
