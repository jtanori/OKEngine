// PR-TESTIMONIAL-CARD — Testimonial with quote, author, role, company
// DS tokens: bg-surface, border-line, rounded-lg, shadow-sm, text-ink, text-ink-secondary
import React from 'react';

export interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  metric?: string;
  className?: string;
}

export function TestimonialCard({ quote, author, role, company, metric, className = '' }: TestimonialCardProps) {
  return (
    <div className={`bg-surface border border-line rounded-lg p-6 shadow-sm flex flex-col gap-4 ${className}`}>
      <div className="text-sm text-ink leading-relaxed">“{quote}”</div>
      <div className="mt-auto flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-ink">{author}</span>
          <span className="text-xs text-ink-secondary">{role}, {company}</span>
        </div>
        {metric && <span className="text-xs font-semibold text-success bg-success-subtle px-2 py-1 rounded-xs">{metric}</span>}
      </div>
    </div>
  );
}
