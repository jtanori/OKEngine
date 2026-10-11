// PR-HOW-IT-WORKS-STEP — Card with pastel illustration + colored number + title + desc
// DS tokens: bg-surface, border-line, rounded-xl, shadow-sm, text-ink, accent
import React from 'react';

export interface HowItWorksStepProps {
  number: number;
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  color?: string;
  title: string;
  description: string;
  isLast?: boolean;
  className?: string;
}

const stepColors: Record<number, string> = {
  1: 'bg-[#6366F1]',
  2: 'bg-[#0EA5E9]',
  3: 'bg-[#10B981]',
  4: 'bg-[#8B5CF6]',
  5: 'bg-[#F43F5E]',
};

export function HowItWorksStep({ number, icon, illustration, color, title, description, isLast = false, className = '' }: HowItWorksStepProps) {
  const numberBg = color || stepColors[number] || 'bg-accent';
  return (
    <div className={`flex flex-col relative bg-surface border border-line rounded-xl shadow-sm overflow-hidden ${className}`}>
      {illustration && <div className="h-28 bg-elevated border-b border-line flex items-center justify-center p-3">{illustration}</div>}
      <div className="flex flex-col gap-3 p-4 relative">
        <div className={`absolute -top-3 left-3 w-7 h-7 rounded-full ${numberBg} text-surface flex items-center justify-center text-2xs font-bold shadow-md`}>
          {number}
        </div>
        <div className={`text-card-title font-semibold text-ink ${illustration ? 'pt-2' : ''}`}>{title}</div>
        <div className="text-xs text-ink-secondary leading-relaxed">{description}</div>
        {icon && <div className="text-ink-muted text-sm">{icon}</div>}
      </div>
      {!isLast && <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-px bg-line/60"></div>}
    </div>
  );
}

export interface HowItWorksProps {
  steps: Array<{ icon?: React.ReactNode; illustration?: React.ReactNode; color?: string; title: string; description: string }>;
  className?: string;
}

export function HowItWorks({ steps, className = '' }: HowItWorksProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-5 gap-6 ${className}`}>
      {steps.map((step, idx) => (
        <HowItWorksStep key={idx} number={idx + 1} icon={step.icon} illustration={step.illustration} color={step.color} title={step.title} description={step.description} isLast={idx === steps.length - 1} />
      ))}
    </div>
  );
}
