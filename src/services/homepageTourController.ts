// ============================================================================
// PURE 5-DOMAIN HOMEPAGE TOUR CONTROLLER & STATE MACHINE
// (src/services/homepageTourController.ts)
//
// Architectural Invariants:
// - Zero imports from server/** or src/repositories/** (enforced by TOUR-SEC-ARCH-01)
// - Enforces single-flight request fencing (requestId, exchangeId, tourRunId, isMounted)
// - Enforces single-terminal exchange lock (terminalLock: true once completed/refused/failed/aborted)
// - Enforces server-authoritative stage completion (only stage_canonical + serverOutcome === 'grounded')
// - Enforces separated stageRetryTarget vs. followUpRetryTarget (P1-04)
// - Enforces atomic pendingSettingsOpId commit rule with server-normalized values (P1-03)
// ============================================================================

import {
  APPROVED_HOMEPAGE_TOUR_CONTRACT,
  OUT_OF_DOMAIN_REFUSAL_PROBE,
  getTourStageContract,
  type CanonicalPublicRoute,
  type HomepageTourStageContract,
  type HomepageTourStageId,
  type PublicDemoContextRoute,
  type PublicHomepageDemoPreset,
} from '../data/homepageTourContract';
import type {
  HomepageDemoCollectionStatus,
  HomepageDemoContextResponse,
  HomepageDemoDeltaEvent,
  HomepageDemoDoneEvent,
  HomepageDemoErrorEvent,
  HomepageDemoMetadataEvent,
  HomepageDemoServerOutcome,
  HomepageDemoValidatedCitation,
} from './homepageDemoStreamAdapter';

export type ExchangeKind = 'stage_canonical' | 'user_followup' | 'refusal_probe';
export type ExchangeStatus =
  | 'streaming'
  | 'completed'
  | 'refused'
  | 'failed'
  | 'aborted';

export interface ConversationExchange {
  exchangeId: string;
  tourRunId: number;
  requestId: number;
  kind: ExchangeKind;
  stageId: HomepageTourStageId;
  prompt: string;
  presetUsed: PublicHomepageDemoPreset;
  currentUrlUsed: PublicDemoContextRoute;
  status: ExchangeStatus;
  terminalLock: boolean;
  serverOutcome?: HomepageDemoServerOutcome;
  answerMarkdown: string;
  sources: HomepageDemoValidatedCitation[];
  cta: { label: string; url: CanonicalPublicRoute } | null;
  errorMessage?: string;
}

export interface AssistantDisplayState {
  isOpen: boolean;
  isSettingsDrawerOpen: boolean;
  lastTriggerKind: 'hero_cta' | 'launcher' | 'none';
}

export interface StageRetryTarget {
  stageId: HomepageTourStageId;
  canonicalPrompt: string;
}

export interface FollowUpRetryTarget {
  exchangeId: string;
  originatingStageId: HomepageTourStageId;
  userPrompt: string;
}

export interface TourSessionState {
  tourRunId: number;
  activeStageId: HomepageTourStageId;
  completedStageIds: HomepageTourStageId[];
  stageRetryTarget: StageRetryTarget | null;
  followUpRetryTarget: FollowUpRetryTarget | null;
}

export interface ConversationState {
  exchanges: ConversationExchange[];
}

export interface RequestLifecycleState {
  activeRequestId: number | null;
  activeExchangeId: string | null;
  activeTourRunId: number | null;
  status: 'idle' | 'streaming';
}

export interface DemoSettingsApplied {
  preset: PublicHomepageDemoPreset;
  currentUrl: PublicDemoContextRoute;
  collectionStatuses: HomepageDemoCollectionStatus[];
}

export interface DemoSettingsDraft {
  preset: PublicHomepageDemoPreset;
  currentUrl: PublicDemoContextRoute;
}

export interface DemoSettingsState {
  appliedSettings: DemoSettingsApplied;
  draftSettings: DemoSettingsDraft;
  pendingSettingsOpId: number | null;
  status: 'idle' | 'applying' | 'failed';
  errorMessage?: string;
}

export interface HomepageTourControllerState {
  isMounted: boolean;
  display: AssistantDisplayState;
  tourSession: TourSessionState;
  conversation: ConversationState;
  requestLifecycle: RequestLifecycleState;
  demoSettings: DemoSettingsState;
}

export interface DispatchedStreamIntent {
  requestId: number;
  exchangeId: string;
  tourRunId: number;
  kind: ExchangeKind;
  stageId: HomepageTourStageId;
  question: string;
  preset: PublicHomepageDemoPreset;
  currentUrl: PublicDemoContextRoute;
  signal: AbortSignal;
}

export interface DispatchedSettingsIntent {
  opId: number;
  preset: PublicHomepageDemoPreset;
  currentUrl: PublicDemoContextRoute;
}

export const DEFAULT_HOMEPAGE_COLLECTION_STATUSES: HomepageDemoCollectionStatus[] = [
  {
    collectionId: 'COL-PUBLIC',
    name: 'Public Product Knowledge',
    visibility: 'everyone',
    authorized: true,
    readyDocumentCount: 4,
  },
  {
    collectionId: 'COL-DOCS',
    name: 'Product Documentation',
    visibility: 'everyone',
    authorized: true,
    readyDocumentCount: 11,
  },
  {
    collectionId: 'COL-LEGAL',
    name: 'Legal & Trust Policies',
    visibility: 'everyone',
    authorized: true,
    readyDocumentCount: 3,
  },
  {
    collectionId: 'COL-CUSTOMER',
    name: 'Customer Workspace Guides',
    visibility: 'members',
    authorized: false,
    readyDocumentCount: 0,
  },
  {
    collectionId: 'COL-INTERNAL',
    name: 'Internal Operations & Security',
    visibility: 'admins',
    authorized: false,
    readyDocumentCount: 0,
  },
];

export function createInitialHomepageTourState(): HomepageTourControllerState {
  const stage1 = APPROVED_HOMEPAGE_TOUR_CONTRACT[0];
  return {
    isMounted: true,
    display: {
      isOpen: false,
      isSettingsDrawerOpen: false,
      lastTriggerKind: 'none',
    },
    tourSession: {
      tourRunId: 1,
      activeStageId: stage1.stageId,
      completedStageIds: [],
      stageRetryTarget: {
        stageId: stage1.stageId,
        canonicalPrompt: stage1.suggestedPrompt,
      },
      followUpRetryTarget: null,
    },
    conversation: {
      exchanges: [],
    },
    requestLifecycle: {
      activeRequestId: null,
      activeExchangeId: null,
      activeTourRunId: null,
      status: 'idle',
    },
    demoSettings: {
      appliedSettings: {
        preset: 'visitor',
        currentUrl: '/',
        collectionStatuses: DEFAULT_HOMEPAGE_COLLECTION_STATUSES.map((row) => ({
          ...row,
        })),
      },
      draftSettings: {
        preset: 'visitor',
        currentUrl: '/',
      },
      pendingSettingsOpId: null,
      status: 'idle',
    },
  };
}

export class HomepageTourController {
  private state: HomepageTourControllerState;
  private nextRequestId = 0;
  private nextSettingsOpId = 0;
  private activeAbortController: AbortController | null = null;
  private listeners = new Set<(state: HomepageTourControllerState) => void>();
  private traceHook?: (step: string, details?: Record<string, unknown>) => void;

  constructor(options?: {
    initialState?: HomepageTourControllerState;
    traceHook?: (step: string, details?: Record<string, unknown>) => void;
  }) {
    this.state = options?.initialState ?? createInitialHomepageTourState();
    this.traceHook = options?.traceHook;
  }

  public getState(): HomepageTourControllerState {
    return this.state;
  }

  public getActiveStageContract(): HomepageTourStageContract {
    return getTourStageContract(this.state.tourSession.activeStageId);
  }

  public subscribe(
    listener: (state: HomepageTourControllerState) => void
  ): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  /**
   * Opens the floating assistant from either the Hero CTA or the floating launcher.
   * If no exchanges exist yet, automatically dispatches Stage 1 canonical question.
   */
  public openAssistant(
    triggerKind: 'hero_cta' | 'launcher'
  ): DispatchedStreamIntent | null {
    if (!this.state.isMounted) return null;
    this.state = {
      ...this.state,
      display: {
        ...this.state.display,
        isOpen: true,
        lastTriggerKind: triggerKind,
      },
    };
    this.emit();

    if (this.state.conversation.exchanges.length === 0) {
      return this.dispatchStageQuestion(this.state.tourSession.activeStageId);
    }
    return null;
  }

  /**
   * Layered Escape / close handler:
   * - If the settings drawer is open and closeLayer === 'escape', closes only the settings drawer.
   * - Otherwise closes the assistant panel.
   */
  public handleDismiss(mode: 'escape' | 'close_button'): 'closed_settings' | 'closed_panel' | 'noop' {
    if (!this.state.isMounted) return 'noop';
    if (mode === 'escape' && this.state.display.isSettingsDrawerOpen) {
      this.state = {
        ...this.state,
        display: {
          ...this.state.display,
          isSettingsDrawerOpen: false,
        },
        demoSettings: {
          ...this.state.demoSettings,
          draftSettings: {
            preset: this.state.demoSettings.appliedSettings.preset,
            currentUrl: this.state.demoSettings.appliedSettings.currentUrl,
          },
        },
      };
      this.emit();
      return 'closed_settings';
    }

    if (this.state.display.isOpen) {
      this.state = {
        ...this.state,
        display: {
          ...this.state.display,
          isOpen: false,
          isSettingsDrawerOpen: false,
        },
      };
      this.emit();
      return 'closed_panel';
    }
    return 'noop';
  }

  public toggleSettingsDrawer(open?: boolean): void {
    if (!this.state.isMounted) return;
    const nextOpen = open ?? !this.state.display.isSettingsDrawerOpen;
    this.state = {
      ...this.state,
      display: {
        ...this.state.display,
        isSettingsDrawerOpen: nextOpen,
      },
      demoSettings: {
        ...this.state.demoSettings,
        draftSettings: {
          preset: this.state.demoSettings.appliedSettings.preset,
          currentUrl: this.state.demoSettings.appliedSettings.currentUrl,
        },
        errorMessage: undefined,
      },
    };
    this.emit();
  }

  public updateDraftSettings(patch: Partial<DemoSettingsDraft>): void {
    if (!this.state.isMounted) return;
    this.state = {
      ...this.state,
      demoSettings: {
        ...this.state.demoSettings,
        draftSettings: {
          ...this.state.demoSettings.draftSettings,
          ...patch,
        },
      },
    };
    this.emit();
  }

  /**
   * Allocates a monotonic pendingSettingsOpId for Apply settings (P1-03).
   * Does NOT abort any active chat stream until the server validates and commits.
   */
  public beginApplySettings(): DispatchedSettingsIntent | null {
    if (!this.state.isMounted) return null;
    const opId = ++this.nextSettingsOpId;
    const { preset, currentUrl } = this.state.demoSettings.draftSettings;

    this.state = {
      ...this.state,
      demoSettings: {
        ...this.state.demoSettings,
        pendingSettingsOpId: opId,
        status: 'applying',
        errorMessage: undefined,
      },
    };
    this.emit();
    return { opId, preset, currentUrl };
  }

  /**
   * Allocates a monotonic pendingSettingsOpId for Reset demo (visitor + '/') (P1-03).
   * Reset demo only resets the demo settings (preset: 'visitor', currentUrl: '/') and
   * does NOT clear conversation history or tour progress.
   */
  public beginResetDemo(): DispatchedSettingsIntent | null {
    if (!this.state.isMounted) return null;
    const opId = ++this.nextSettingsOpId;
    this.state = {
      ...this.state,
      demoSettings: {
        ...this.state.demoSettings,
        draftSettings: {
          preset: 'visitor',
          currentUrl: '/',
        },
        pendingSettingsOpId: opId,
        status: 'applying',
        errorMessage: undefined,
      },
    };
    this.emit();
    return { opId, preset: 'visitor', currentUrl: '/' };
  }

  /**
   * Commits a settings response if and only if opId === state.demoSettings.pendingSettingsOpId && isMounted (P1-03).
   * Writes the server-normalized values and atomically aborts any in-flight chat stream.
   */
  public commitSettingsSuccess(
    opId: number,
    serverResponse: HomepageDemoContextResponse
  ): boolean {
    if (
      !this.state.isMounted ||
      this.state.demoSettings.pendingSettingsOpId !== opId
    ) {
      this.traceHook?.('settings_commit_rejected_stale_op', {
        opId,
        pendingSettingsOpId: this.state.demoSettings.pendingSettingsOpId,
      });
      return false;
    }

    // Abort any in-flight chat stream now that new settings are committed
    this.abortInFlightStreamInternal();

    this.state = {
      ...this.state,
      demoSettings: {
        appliedSettings: {
          preset: serverResponse.preset,
          currentUrl: serverResponse.currentUrl,
          collectionStatuses: serverResponse.collectionStatuses.map((row) => ({
            ...row,
          })),
        },
        draftSettings: {
          preset: serverResponse.preset,
          currentUrl: serverResponse.currentUrl,
        },
        pendingSettingsOpId: null,
        status: 'idle',
        errorMessage: undefined,
      },
    };
    this.emit();
    return true;
  }

  /**
   * Handles a failed settings response if and only if opId === state.demoSettings.pendingSettingsOpId && isMounted (P1-03).
   * Leaves appliedSettings and any active chat stream untouched.
   */
  public commitSettingsFailure(opId: number, errorMessage: string): boolean {
    if (
      !this.state.isMounted ||
      this.state.demoSettings.pendingSettingsOpId !== opId
    ) {
      return false;
    }

    this.state = {
      ...this.state,
      demoSettings: {
        ...this.state.demoSettings,
        pendingSettingsOpId: null,
        status: 'failed',
        errorMessage,
      },
    };
    this.emit();
    return false;
  }

  private abortInFlightStreamInternal(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    const activeExId = this.state.requestLifecycle.activeExchangeId;
    const updatedExchanges = this.state.conversation.exchanges.map((ex) => {
      if (ex.exchangeId === activeExId && !ex.terminalLock) {
        return {
          ...ex,
          status: 'aborted' as const,
          terminalLock: true,
        };
      }
      return ex;
    });

    this.state = {
      ...this.state,
      conversation: {
        exchanges: updatedExchanges,
      },
      requestLifecycle: {
        activeRequestId: null,
        activeExchangeId: null,
        activeTourRunId: null,
        status: 'idle',
      },
    };
  }

  private allocateAndStartExchange(params: {
    kind: ExchangeKind;
    stageId: HomepageTourStageId;
    prompt: string;
  }): DispatchedStreamIntent {
    this.abortInFlightStreamInternal();

    const requestId = ++this.nextRequestId;
    const exchangeId = `ex_${requestId}`;
    const tourRunId = this.state.tourSession.tourRunId;
    const { preset, currentUrl } = this.state.demoSettings.appliedSettings;

    const controller = new AbortController();
    this.activeAbortController = controller;

    const newExchange: ConversationExchange = {
      exchangeId,
      tourRunId,
      requestId,
      kind: params.kind,
      stageId: params.stageId,
      prompt: params.prompt,
      presetUsed: preset,
      currentUrlUsed: currentUrl,
      status: 'streaming',
      terminalLock: false,
      answerMarkdown: '',
      sources: [],
      cta: null,
    };

    const nextStageRetryTarget: StageRetryTarget | null =
      params.kind === 'stage_canonical'
        ? { stageId: params.stageId, canonicalPrompt: params.prompt }
        : this.state.tourSession.stageRetryTarget;

    const nextFollowUpRetryTarget: FollowUpRetryTarget | null =
      params.kind === 'user_followup' || params.kind === 'refusal_probe'
        ? {
            exchangeId,
            originatingStageId: params.stageId,
            userPrompt: params.prompt,
          }
        : this.state.tourSession.followUpRetryTarget;

    this.state = {
      ...this.state,
      tourSession: {
        ...this.state.tourSession,
        activeStageId:
          params.kind === 'stage_canonical'
            ? params.stageId
            : this.state.tourSession.activeStageId,
        stageRetryTarget: nextStageRetryTarget,
        followUpRetryTarget: nextFollowUpRetryTarget,
      },
      conversation: {
        exchanges: [...this.state.conversation.exchanges, newExchange],
      },
      requestLifecycle: {
        activeRequestId: requestId,
        activeExchangeId: exchangeId,
        activeTourRunId: tourRunId,
        status: 'streaming',
      },
    };

    this.emit();

    return {
      requestId,
      exchangeId,
      tourRunId,
      kind: params.kind,
      stageId: params.stageId,
      question: params.prompt,
      preset,
      currentUrl,
      signal: controller.signal,
    };
  }

  /**
   * Dispatches a canonical tour stage question and sets activeStageId + stageRetryTarget.
   */
  public dispatchStageQuestion(
    stageId: HomepageTourStageId
  ): DispatchedStreamIntent | null {
    if (!this.state.isMounted) return null;
    const contract = getTourStageContract(stageId);
    return this.allocateAndStartExchange({
      kind: 'stage_canonical',
      stageId: contract.stageId,
      prompt: contract.suggestedPrompt,
    });
  }

  /**
   * Advances to the next stage defined by the current stage's discriminated progression contract.
   */
  public advanceToNextStage(): DispatchedStreamIntent | null {
    if (!this.state.isMounted) return null;
    const currentContract = this.getActiveStageContract();
    if (currentContract.progression.kind !== 'advance_stage') {
      return null;
    }
    return this.dispatchStageQuestion(currentContract.progression.nextStageId);
  }

  /**
   * Dispatches a user follow-up question without mutating activeStageId,
   * stageRetryTarget, or completedStageIds (P1-04).
   */
  public dispatchFollowUpQuestion(rawPrompt: string): DispatchedStreamIntent | null {
    if (!this.state.isMounted) return null;
    const trimmed = rawPrompt.trim();
    if (!trimmed) return null;
    return this.allocateAndStartExchange({
      kind: 'user_followup',
      stageId: this.state.tourSession.activeStageId,
      prompt: trimmed,
    });
  }

  /**
   * Dispatches the canonical out-of-domain refusal probe without mutating activeStageId,
   * stageRetryTarget, or completedStageIds.
   */
  public dispatchRefusalProbe(): DispatchedStreamIntent | null {
    if (!this.state.isMounted) return null;
    return this.allocateAndStartExchange({
      kind: 'refusal_probe',
      stageId: this.state.tourSession.activeStageId,
      prompt: OUT_OF_DOMAIN_REFUSAL_PROBE,
    });
  }

  /**
   * Retries the active stage's canonical prompt (P1-04).
   */
  public retryStageQuestion(): DispatchedStreamIntent | null {
    if (!this.state.isMounted) return null;
    const target = this.state.tourSession.stageRetryTarget ?? {
      stageId: this.state.tourSession.activeStageId,
      canonicalPrompt: getTourStageContract(this.state.tourSession.activeStageId)
        .suggestedPrompt,
    };
    return this.allocateAndStartExchange({
      kind: 'stage_canonical',
      stageId: target.stageId,
      prompt: target.canonicalPrompt,
    });
  }

  /**
   * Retries the last follow-up prompt without altering stageRetryTarget or activeStageId (P1-04).
   */
  public retryFollowUpQuestion(): DispatchedStreamIntent | null {
    if (!this.state.isMounted) return null;
    const target = this.state.tourSession.followUpRetryTarget;
    if (!target) return null;
    return this.allocateAndStartExchange({
      kind: 'user_followup',
      stageId: this.state.tourSession.activeStageId,
      prompt: target.userPrompt,
    });
  }

  /**
   * Restarts the guided tour from Stage 1, incrementing tourRunId so any late
   * callbacks from the previous run are fenced and dropped (P1-04).
   */
  public restartTour(): DispatchedStreamIntent | null {
    if (!this.state.isMounted) return null;
    this.abortInFlightStreamInternal();

    const nextTourRunId = this.state.tourSession.tourRunId + 1;
    const stage1 = APPROVED_HOMEPAGE_TOUR_CONTRACT[0];

    this.state = {
      ...this.state,
      tourSession: {
        tourRunId: nextTourRunId,
        activeStageId: stage1.stageId,
        completedStageIds: [],
        stageRetryTarget: {
          stageId: stage1.stageId,
          canonicalPrompt: stage1.suggestedPrompt,
        },
        followUpRetryTarget: null,
      },
      conversation: {
        exchanges: [],
      },
    };
    this.emit();

    return this.dispatchStageQuestion(stage1.stageId);
  }

  private verifyActiveFence(event: {
    requestId: number;
    exchangeId: string;
    tourRunId: number;
  }): ConversationExchange | null {
    if (!this.state.isMounted) {
      this.traceHook?.('7:client_terminal_lock:rejected_unmounted', event);
      return null;
    }
    const exchange = this.state.conversation.exchanges.find(
      (ex) => ex.exchangeId === event.exchangeId
    );
    if (exchange?.terminalLock && event.tourRunId === this.state.tourSession.tourRunId) {
      this.traceHook?.('7:client_terminal_lock:rejected_already_terminal', event);
      return null;
    }
    if (
      event.requestId !== this.state.requestLifecycle.activeRequestId ||
      event.exchangeId !== this.state.requestLifecycle.activeExchangeId ||
      event.tourRunId !== this.state.tourSession.tourRunId ||
      !exchange
    ) {
      this.traceHook?.('7:client_terminal_lock:rejected_stale_fence', event);
      return null;
    }
    return exchange;
  }

  public handleMetadataEvent(event: HomepageDemoMetadataEvent): boolean {
    const target = this.verifyActiveFence(event);
    if (!target) return false;

    const updatedExchanges = this.state.conversation.exchanges.map((ex) => {
      if (ex.exchangeId !== event.exchangeId) return ex;
      return {
        ...ex,
        serverOutcome: event.serverOutcome,
        sources: event.sources,
        cta: event.cta,
      };
    });

    const nextCollectionStatuses =
      event.collectionStatuses.length > 0
        ? event.collectionStatuses
        : this.state.demoSettings.appliedSettings.collectionStatuses;

    this.state = {
      ...this.state,
      conversation: {
        exchanges: updatedExchanges,
      },
      demoSettings: {
        ...this.state.demoSettings,
        appliedSettings: {
          ...this.state.demoSettings.appliedSettings,
          collectionStatuses: nextCollectionStatuses,
        },
      },
    };
    this.emit();
    return true;
  }

  public handleDeltaEvent(event: HomepageDemoDeltaEvent): boolean {
    const target = this.verifyActiveFence(event);
    if (!target) return false;

    const updatedExchanges = this.state.conversation.exchanges.map((ex) => {
      if (ex.exchangeId !== event.exchangeId) return ex;
      return {
        ...ex,
        answerMarkdown: ex.answerMarkdown + event.textDelta,
      };
    });

    this.state = {
      ...this.state,
      conversation: {
        exchanges: updatedExchanges,
      },
    };
    this.emit();
    return true;
  }

  public handleDoneEvent(event: HomepageDemoDoneEvent): boolean {
    const target = this.verifyActiveFence(event);
    if (!target) return false;

    const outcome = event.serverOutcome ?? target.serverOutcome ?? 'failed';
    let finalStatus: ExchangeStatus = 'failed';

    if (
      outcome === 'grounded' &&
      target.sources.length > 0 &&
      target.answerMarkdown.trim().length > 0
    ) {
      finalStatus = 'completed';
    } else if (outcome === 'refused') {
      finalStatus = 'refused';
    } else {
      finalStatus = 'failed';
    }

    const updatedExchanges = this.state.conversation.exchanges.map((ex) => {
      if (ex.exchangeId !== event.exchangeId) return ex;
      return {
        ...ex,
        status: finalStatus,
        terminalLock: true,
        serverOutcome: outcome,
        sources: finalStatus === 'completed' ? ex.sources : [],
        errorMessage:
          finalStatus === 'failed'
            ? 'Unable to verify grounded answer from authorized sources.'
            : undefined,
      };
    });

    // P0-03 & P1-04: Only a canonical stage exchange with finalStatus === 'completed' (serverOutcome === 'grounded')
    // marks the stage as completed. Follow-ups and refusals NEVER mark the stage as completed.
    let nextCompleted = this.state.tourSession.completedStageIds;
    if (
      target.kind === 'stage_canonical' &&
      finalStatus === 'completed' &&
      !nextCompleted.includes(target.stageId)
    ) {
      nextCompleted = [...nextCompleted, target.stageId];
    }

    this.activeAbortController = null;
    this.state = {
      ...this.state,
      tourSession: {
        ...this.state.tourSession,
        completedStageIds: nextCompleted,
      },
      conversation: {
        exchanges: updatedExchanges,
      },
      requestLifecycle: {
        activeRequestId: null,
        activeExchangeId: null,
        activeTourRunId: null,
        status: 'idle',
      },
    };

    this.traceHook?.('7:client_terminal_lock:locked_done', {
      exchangeId: event.exchangeId,
      finalStatus,
      completedStageIds: nextCompleted,
    });
    this.emit();
    return true;
  }

  public handleErrorEvent(event: HomepageDemoErrorEvent): boolean {
    const target = this.verifyActiveFence(event);
    if (!target) return false;

    const finalStatus: ExchangeStatus = event.aborted ? 'aborted' : 'failed';
    const updatedExchanges = this.state.conversation.exchanges.map((ex) => {
      if (ex.exchangeId !== event.exchangeId) return ex;
      return {
        ...ex,
        status: finalStatus,
        terminalLock: true,
        sources: [],
        errorMessage: event.message || 'Request failed',
      };
    });

    this.activeAbortController = null;
    this.state = {
      ...this.state,
      conversation: {
        exchanges: updatedExchanges,
      },
      requestLifecycle: {
        activeRequestId: null,
        activeExchangeId: null,
        activeTourRunId: null,
        status: 'idle',
      },
    };

    this.traceHook?.('7:client_terminal_lock:locked_error', {
      exchangeId: event.exchangeId,
      finalStatus,
      code: event.code,
    });
    this.emit();
    return true;
  }

  public unmount(): void {
    this.abortInFlightStreamInternal();
    this.state = {
      ...this.state,
      isMounted: false,
      demoSettings: {
        ...this.state.demoSettings,
        pendingSettingsOpId: null,
      },
    };
    this.listeners.clear();
  }
}
