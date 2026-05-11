/**
 * Reference tab — renders the QBScript language reference.
 *
 * Source markdown is mirrored from
 * websites/quest-bound-docs/docs/scripts/qbscript.md and re-copied when the
 * docs change. We render it inline (instead of fetching from the docs site)
 * so the engine's build is self-contained.
 */

import { cn } from '@/lib/utils';
import { isValidElement, useCallback, useRef, type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import qbscriptReference from './qbscript-reference.md?raw';

const ID_PREFIX = 'qbref-';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children);
  return '';
}

/**
 * Strip Docusaurus admonition fences (`:::tip`, `:::note`, etc.) and the
 * frontmatter block. react-markdown wouldn't recognize these and would render
 * them as literal text.
 */
function preprocess(md: string): string {
  return md
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/^:::\w+.*$/gm, '')
    .replace(/^:::\s*$/gm, '');
}

const REFERENCE_BODY = preprocess(qbscriptReference);

function buildComponents(
  onHashLinkClick: (id: string) => void,
): Components {
  return {
  h1: ({ className, children, ...props }) => (
    <h1
      id={ID_PREFIX + slugify(nodeText(children))}
      className={cn('text-base font-semibold mt-0 mb-3 text-foreground scroll-mt-2', className)}
      {...props}>
      {children}
    </h1>
  ),
  h2: ({ className, children, ...props }) => (
    <h2
      id={ID_PREFIX + slugify(nodeText(children))}
      className={cn(
        'text-xs uppercase tracking-wider text-primary mt-5 mb-2 pt-3 border-t border-border scroll-mt-2',
        className,
      )}
      {...props}>
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }) => (
    <h3
      id={ID_PREFIX + slugify(nodeText(children))}
      className={cn(
        'text-xs uppercase tracking-wider text-foreground mt-4 mb-1.5 scroll-mt-2',
        className,
      )}
      {...props}>
      {children}
    </h3>
  ),
  h4: ({ className, children, ...props }) => (
    <h4
      id={ID_PREFIX + slugify(nodeText(children))}
      className={cn('text-xs font-semibold text-foreground mt-3 mb-1 scroll-mt-2', className)}
      {...props}>
      {children}
    </h4>
  ),
  p: ({ className, ...props }) => (
    <p className={cn('my-2 leading-relaxed', className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn('list-disc pl-5 my-2 space-y-1', className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn('list-decimal pl-5 my-2 space-y-1', className)} {...props} />
  ),
  li: ({ className, ...props }) => <li className={cn('leading-snug', className)} {...props} />,
  strong: ({ className, ...props }) => (
    <strong className={cn('font-semibold text-foreground', className)} {...props} />
  ),
  em: ({ className, ...props }) => <em className={cn('italic', className)} {...props} />,
  a: ({ className, href, onClick, ...props }) => (
    <a
      href={href}
      className={cn('text-primary underline hover:text-primary/80', className)}
      onClick={(e) => {
        if (href && href.startsWith('#')) {
          e.preventDefault();
          onHashLinkClick(href.slice(1));
        }
        onClick?.(e);
      }}
      {...props}
    />
  ),
  code: ({ className, children, ...props }) => {
    // Inline code only — fenced blocks come through as <pre><code>.
    const isBlock = className && /\blanguage-/.test(className);
    if (isBlock) {
      return (
        <code className={cn('font-mono text-[11px] block text-zinc-100', className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className={cn(
          'font-mono text-[11px] px-1 py-0.5 rounded bg-zinc-900 text-primary',
          className,
        )}
        {...props}>
        {children}
      </code>
    );
  },
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        'rounded border border-zinc-800 bg-zinc-900 p-2 my-2 overflow-x-auto text-[11px] leading-snug text-zinc-100',
        className,
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        'border-l-2 border-primary pl-3 my-2 py-1 text-muted-foreground bg-primary/5 rounded-r',
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn('my-4 border-border', className)} {...props} />
  ),
  table: ({ className, ...props }) => (
    <div className='my-2 overflow-x-auto'>
      <table className={cn('w-full text-[11px] border-collapse', className)} {...props} />
    </div>
  ),
  thead: ({ className, ...props }) => (
    <thead className={cn('text-left', className)} {...props} />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        'px-2 py-1.5 border-b border-border font-semibold text-foreground uppercase tracking-wide text-[10px] break-words',
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn('px-2 py-1.5 border-b border-border/60 align-top break-words', className)}
      {...props}
    />
  ),
  };
}

export function ReferenceTab() {
  const containerRef = useRef<HTMLDivElement>(null);

  // The renderer lives inside a Radix ScrollArea, whose viewport is the
  // overflow:scroll element — not the page. Default browser anchor jumps
  // don't reliably target it, so resolve the heading by id within our
  // container and call scrollIntoView.
  const handleHashLinkClick = useCallback((rawId: string) => {
    const root = containerRef.current;
    if (!root) return;
    const target =
      root.querySelector<HTMLElement>(`[id="${ID_PREFIX}${CSS.escape(rawId)}"]`) ??
      root.querySelector<HTMLElement>(`[id="${CSS.escape(rawId)}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const components = buildComponents(handleHashLinkClick);

  return (
    <div
      ref={containerRef}
      className='h-full overflow-auto p-4 text-xs text-muted-foreground max-w-none break-words'>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {REFERENCE_BODY}
      </Markdown>
    </div>
  );
}
