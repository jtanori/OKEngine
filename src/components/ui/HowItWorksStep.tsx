// PR-HOW-IT-WORKS-STEP — Step number + icon + title + desc + connector line
// DS tokens: bg-surface, border-line, text-ink, accent
import React from 'react';

export interface HowItWorksStepProps {
  number: number;
  icon?: React.ReactNode;
  title: string;
  description: string;
  isLast?: boolean;
  className?: string;
}

export function HowItWorksStep({ number, icon, title, description, isLast = false, className = '' }: HowItWorksStepProps) {
  return (
    <div className={`flex flex-col items-start gap-3 relative ${className}`}>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-ink text-surface flex items-center justify-center text-xs font-semibold">
          {number}
        </div>
        {icon && <div className="text-ink-muted text-sm">{icon}</div>}
      </div>
      <div className="text-sm font-semibold text-ink">{title}</div>
      <div className="text-xs text-ink-secondary leading-relaxed">{description}</div>
      {!isLast && (
        <div className="hidden md:block absolute top-4 left-8 w-[calc(100%-2rem)] h-px bg-line -z-10"></div>
      )}
    </div>
  );
}

export interface HowItWorksProps {
  steps: Array<{ icon?: React.ReactNode; title: string; description: string }>;
  className?: string;
}

export function HowItWorks({ steps, className = '' }: HowItWorksProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-5 gap-8 ${className}`}>
      {steps.map((step, idx) => (
        <HowItWorksStep key={idx} number={idx + 1} icon={step.icon} title={step.title} description={step.description} isLast={idx === steps.length - 1} />
      ))}
    </div>
  );
}
