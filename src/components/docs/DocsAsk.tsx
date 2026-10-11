// CO-DOCS-ASK — Ask Box inline with real retrieval, citations, feedback, next-step — uses DogfoodInlineBot under hood
import React from 'react';
import { DocsAsk as PRDocsAsk } from '../ui/DocsAsk';
import { DogfoodInlineBot } from '../public/DogfoodInlineBot';

export interface DocsAskCOProps {
  currentDocSlug: string;
  currentUrl: string;
  collectionIds: string[];
}

export function DocsAskCO({ currentDocSlug, currentUrl, collectionIds }: DocsAskCOProps) {
  return (
    <div className="flex flex-col gap-4">
      <PRDocsAsk currentDocSlug={currentDocSlug} currentUrl={currentUrl} collectionIds={collectionIds} />
      <div className="rounded-lg border border-line bg-surface p-1">
        <DogfoodInlineBot embedId="EMB-PUBLIC-DOCS" currentUrl={currentUrl} collectionIds={collectionIds} />
      </div>
    </div>
  );
}
