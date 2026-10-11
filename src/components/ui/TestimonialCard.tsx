// PR-TESTIMONIAL-CARD — Testimonial with quote, avatar, pill, author
// DS tokens: bg-surface, border-line, rounded-xl, shadow-sm, text-ink, accent-subtle
import React from 'react';

export interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  initials: string;
  color?: string;
  metric?: string;
  className?: string;
}

export function TestimonialCard({ quote, author, role, company, initials, color = 'bg-[#6366F1]', metric, className = '' }: TestimonialCardProps) {
  return (
    <div className={`bg-surface border border-line rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 ${className}`}>
      <div className="text-accent/20 text-lg leading-none">“”</div>
      {metric && <span className="inline-flex w-fit rounded-full bg-accent-subtle border border-accent/10 text-accent text-2xs font-medium px-2.5 py-1">{metric}</span>}
      <div className="text-sm text-ink leading-relaxed">«{quote}»</div>
      <div className="mt-auto flex items-center gap-3 pt-4 border-t border-line">
        <div className={`w-9 h-9 rounded-full ${color} text-surface flex items-center justify-center text-xs font-bold shadow-sm`}>{initials}</div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-ink">{author}</span>
          <span className="text-xs text-ink-secondary">{role} · {company}</span>
        </div>
      </div>
    </div>
  );
}
