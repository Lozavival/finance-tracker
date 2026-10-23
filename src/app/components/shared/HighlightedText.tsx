import React, { useMemo } from 'react';
import { findMatchRanges } from '@/data/search';

export interface HighlightedTextProps {
  text: string;
  tokens?: string[];
  className?: string;
  highlightClassName?: string;
}

export function HighlightedText({
  text,
  tokens = [],
  className,
  highlightClassName = 'rounded-xs bg-theme-cyan/20 text-theme-cyan font-medium px-0.5',
}: HighlightedTextProps) {
  const ranges = useMemo(() => {
    if (!tokens || tokens.length === 0) return [];
    return findMatchRanges(text, tokens);
  }, [text, tokens]);

  if (ranges.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  for (let i = 0; i < ranges.length; i++) {
    const { start, end } = ranges[i];

    if (start > lastIndex) {
      elements.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, start)}</span>);
    }

    elements.push(
      <mark key={`mark-${start}`} className={highlightClassName}>
        {text.slice(start, end)}
      </mark>,
    );

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    elements.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <span className={className}>{elements}</span>;
}
