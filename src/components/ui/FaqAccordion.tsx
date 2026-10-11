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
    <div className={`flex flex-col ${className}`}>
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={idx} className="border-t border-line group">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="w-full flex items-center justify-between gap-4 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold text-ink">{item.question}</span>
              <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-ink-muted transition-colors shrink-0 ${isOpen ? 'bg-accent text-surface border-accent rotate-45' : 'bg-white border-line'}`}>+</span>
            </button>
            {isOpen && (
              <div className="pb-4 text-sm text-ink-secondary leading-relaxed">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
      <div className="border-t border-line"></div>
    </div>
  );
}
