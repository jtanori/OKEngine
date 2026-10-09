// ============================================================================
// RENDER-001 §73–74: Rendering Observability & Versioning
// Tracks render telemetry without logging sensitive document content.
// ============================================================================

import { RENDERER_VERSION, RenderContext } from '../content.types';

export type RenderTelemetryEvent =
  | 'render_success'
  | 'render_failure'
  | 'unsupported_node'
  | 'sanitization_event'
  | 'image_failure'
  | 'media_failure'
  | 'copy_action'
  | 'share_action'
  | 'save_action'
  | 'edit_source_action'
  | 'report_issue_action';

export interface RenderMetricsSnapshot {
  rendererVersion: number;
  counters: Record<RenderTelemetryEvent, number>;
  lastContext?: RenderContext;
  lastLanguage?: string;
}

class RenderObservabilityTracker {
  private counters: Record<RenderTelemetryEvent, number> = {
    render_success: 0,
    render_failure: 0,
    unsupported_node: 0,
    sanitization_event: 0,
    image_failure: 0,
    media_failure: 0,
    copy_action: 0,
    share_action: 0,
    save_action: 0,
    edit_source_action: 0,
    report_issue_action: 0,
  };

  private lastContext?: RenderContext;
  private lastLanguage?: string;

  record(
    event: RenderTelemetryEvent,
    dimensions?: { context?: RenderContext; language?: string; count?: number }
  ): void {
    const inc = dimensions?.count ?? 1;
    this.counters[event] = (this.counters[event] || 0) + inc;
    if (dimensions?.context) this.lastContext = dimensions.context;
    if (dimensions?.language) this.lastLanguage = dimensions.language;
  }

  getSnapshot(): RenderMetricsSnapshot {
    return {
      rendererVersion: RENDERER_VERSION,
      counters: { ...this.counters },
      lastContext: this.lastContext,
      lastLanguage: this.lastLanguage,
    };
  }
}

export const renderObservability = new RenderObservabilityTracker();
