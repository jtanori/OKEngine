// PR-METRIC — Metric display with value + label, for landing metrics bar
// DS tokens: text-ink, text-ink-secondary, font-sans, font-mono
import React from 'react';

export interface MetricProps {
  value: string;
  label: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Metric({ value, label, sublabel, size = 'md', className = '' }: MetricProps) {
  const valueSize = size === 'lg' ? 'text-metric-value font-bold tracking-tight' : size === 'sm' ? 'text-lg font-semibold' : 'text-2xl font-bold';
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className={`${valueSize} text-ink font-sans`}>{value}</div>
      <div className="text-xs font-medium uppercase tracking-wider text-ink-secondary">{label}</div>
      {sublabel && <div className="text-2xs text-ink-muted">{sublabel}</div>}
    </div>
  );
}

export interface MetricsBarProps {
  metrics: Array<{ value: string; label: string; sublabel?: string }>;
  className?: string;
}

export function MetricsBar({ metrics, className = '' }: MetricsBarProps) {
  return (
    <div className={`grid grid-cols-2 gap-8 md:grid-cols-4 ${className}`}>
      {metrics.map((m, i) => (
        <Metric key={i} value={m.value} label={m.label} sublabel={m.sublabel} />
      ))}
    </div>
  );
}
