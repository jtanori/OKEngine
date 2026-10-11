// PR-FAQ-ACCORDION — FAQ accordion with Q + A, single expand
// DS tokens: border-line, text-ink, text-ink-secondary, bg-surface
import React, { useState } from 'react';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqAccordionProps {
  items: FaqItem[];
  className?: string;
}

export function FaqAccordion({ items, className = '' }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className={`divide-y divide-line border border-line rounded-md bg-surface ${className}`}>
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={idx} className="group">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-elevated transition-colors"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-medium text-ink">{item.question}</span>
              <span className={`text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}>⌄</span>
            </button>
            {isOpen && (
              <div className="px-6 pb-4 text-sm text-ink-secondary leading-relaxed">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
