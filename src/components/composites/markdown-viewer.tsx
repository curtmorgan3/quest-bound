import Markdown, { defaultUrlTransform } from 'react-markdown';

/** Allow data: and blob: URLs (e.g. embedded images) in addition to default safe protocols. */
function urlTransform(url: string): string {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('data:') || lower.startsWith('blob:')) {
    return trimmed;
  }
  return defaultUrlTransform(url);
}

function decodeLineBreakEscapes(value: string): string {
  return value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');
}

export interface MarkdownViewerProps {
  value?: string;
  className?: string;
}

export function MarkdownViewer({ value = '', className }: MarkdownViewerProps) {
  return (
    <div className={className}>
      <Markdown urlTransform={urlTransform}>{decodeLineBreakEscapes(value)}</Markdown>
    </div>
  );
}
