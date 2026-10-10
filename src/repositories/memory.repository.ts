import {
	INITIAL_COLLECTIONS,
	INITIAL_DOCUMENTS,
	INITIAL_PUBLIC_EMBEDS,
	INITIAL_WORKSPACE,
} from '../data/seedData';
import type {
	ChatMessage,
	ChatSession,
	Collection,
	DocumentChunk,
	EmbedInstance,
	KnowledgeDocument,
	Workspace,
} from '../types';
import type {
	AuthorizedRetrievalQuery,
	RepositoryRegistry,
	RetrievedChunkResult,
	UsageEvent,
	UsageRecord,
} from './types';

let workspaces: Workspace[] = [{ ...INITIAL_WORKSPACE }];
let collections: Collection[] = INITIAL_COLLECTIONS.map((item) => ({ ...item }));
let documents: KnowledgeDocument[] = INITIAL_DOCUMENTS.map((item) => ({ ...item }));
let embeds: EmbedInstance[] = INITIAL_PUBLIC_EMBEDS.map((item) => ({ ...item }));
let sessions: ChatSession[] = [];
let usageRecords: UsageRecord[] = [];
const documentChunks = new Map<string, DocumentChunk[]>();

function makeChunks(document: KnowledgeDocument, collection: Collection | undefined): DocumentChunk[] {
	const lines = document.content.split('\n');
	const result: DocumentChunk[] = [];
	let heading = document.title;
	let body: string[] = [];

	const flush = (endLine: number) => {
		const content = body.join('\n').trim();
		if (content) {
			result.push({
				id: `chk_${document.id}_${result.length + 1}`,
				documentId: document.id,
				collectionId: document.collectionId,
				collectionVisibility: collection?.visibility ?? 'everyone',
				documentTitle: document.title,
				filename: document.filename,
				content: `${heading}\n\n${content}`,
				lineRange: `Line 1-${endLine}`,
			});
		}
		body = [];
	};

	lines.forEach((line, index) => {
		if (/^#{1,6}\s/.test(line)) {
			flush(index);
			heading = line.replace(/^#{1,6}\s*/, '').trim() || document.title;
		} else {
			body.push(line);
		}
	});
	flush(lines.length);
	return result;
}

export class MemoryRetrievalService {
	async retrieveAuthorizedChunks(
		query: AuthorizedRetrievalQuery
	): Promise<RetrievedChunkResult[]> {
		const allowedCollections = new Set(query.authorizedCollectionIds);
		const narrowedDocuments = query.narrowedDocumentIds?.length
			? new Set(query.narrowedDocumentIds)
			: undefined;
		const terms = query.query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];

		return documents
			.filter(
				(document) =>
					document.workspaceId === query.workspaceId &&
					document.status === 'ready' &&
					!document.deletedAt &&
					allowedCollections.has(document.collectionId) &&
					(!narrowedDocuments || narrowedDocuments.has(document.id))
			)
			.flatMap((document) =>
				(documentChunks.get(document.id) ??
					makeChunks(document, collections.find((item) => item.id === document.collectionId))).map(
					(chunk) => {
					const lowered = chunk.content.toLowerCase();
					const matches = terms.filter((term) => lowered.includes(term)).length;
					return {
						chunkId: chunk.id,
						documentId: document.id,
						collectionId: document.collectionId,
						title: document.title,
						filename: document.filename,
						headingPath: chunk.content.split('\n')[0] || document.title,
						content: chunk.content,
						language: document.language ?? 'en',
						score: terms.length ? matches / terms.length : 0,
					};
					}
				)
			)
			.filter((chunk) => chunk.score > 0)
			.sort((left, right) => right.score - left.score)
			.slice(0, query.limit ?? 6);
	}
}

export const memoryRepositories: RepositoryRegistry = {
	workspaces: {
		getBySlug: async (slug) => workspaces.find((item) => item.slug === slug) ?? null,
		getById: async (id) => workspaces.find((item) => item.id === id) ?? null,
		updateSettings: async (id, patch) => {
			const index = workspaces.findIndex((item) => item.id === id);
			if (index < 0) return null;
			workspaces[index] = { ...workspaces[index], ...patch, id };
			return workspaces[index];
		},
	},
	collections: {
		listByWorkspace: async (workspaceId, allowedVisibility) =>
			collections.filter(
				(item) =>
					item.workspaceId === workspaceId &&
					(!allowedVisibility || allowedVisibility.includes(item.visibility))
			),
		getById: async (workspaceId, collectionId) =>
			collections.find(
				(item) => item.workspaceId === workspaceId && item.id === collectionId
			) ?? null,
		create: async (collection) => {
			collections = collections.filter((item) => item.id !== collection.id);
			collections.push({ ...collection });
			return collection;
		},
		update: async (workspaceId, collectionId, patch) => {
			const index = collections.findIndex(
				(item) => item.workspaceId === workspaceId && item.id === collectionId
			);
			if (index < 0) return null;
			collections[index] = { ...collections[index], ...patch, id: collectionId, workspaceId };
			return collections[index];
		},
	},
	documents: {
		listAuthorized: async ({ workspaceId, authorizedCollectionIds, narrowedDocumentIds }) => {
			const allowedCollections = new Set(authorizedCollectionIds);
			const narrowedDocuments = narrowedDocumentIds?.length
				? new Set(narrowedDocumentIds)
				: undefined;
			return documents.filter(
				(item) =>
					item.workspaceId === workspaceId &&
					allowedCollections.has(item.collectionId) &&
					item.status === 'ready' &&
					!item.deletedAt &&
					(!narrowedDocuments || narrowedDocuments.has(item.id))
			);
		},
		getById: async (workspaceId, documentId) =>
			documents.find((item) => item.workspaceId === workspaceId && item.id === documentId) ?? null,
		upsertDocument: async (document) => {
			documents = documents.filter((item) => item.id !== document.id);
			documents.push({ ...document });
			return document;
		},
		softDeleteDocument: async (workspaceId, documentId) => {
			documents = documents.map((item) =>
				item.workspaceId === workspaceId && item.id === documentId
					? { ...item, deletedAt: new Date().toISOString() }
					: item
			);
		},
		listChunksByDocument: async (workspaceId, documentId) => {
			const document = documents.find(
				(item) => item.workspaceId === workspaceId && item.id === documentId
			);
			if (!document) return [];
			return (
				documentChunks.get(document.id) ??
				makeChunks(document, collections.find((item) => item.id === document.collectionId))
			);
		},
		replaceDocumentChunks: async (workspaceId, documentId, collectionId, chunks) => {
			const document = documents.find(
				(item) => item.workspaceId === workspaceId && item.id === documentId
			);
			if (document) {
				document.collectionId = collectionId;
				document.chunkCount = chunks.length;
				documentChunks.set(documentId, chunks.map((chunk) => ({ ...chunk })));
			}
		},
	},
	embeds: {
		listByWorkspace: async (workspaceId) => embeds.filter((item) => item.workspaceId === workspaceId),
		getById: async (workspaceId, embedId) =>
			embeds.find((item) => item.workspaceId === workspaceId && item.id === embedId) ?? null,
		upsertEmbed: async (embed) => {
			embeds = embeds.filter((item) => item.id !== embed.id);
			embeds.push({ ...embed });
			return embed;
		},
	},
	conversations: {
		listSessions: async (workspaceId) => sessions.filter((item) => item.workspaceId === workspaceId),
		createSession: async (session) => {
			sessions = sessions.filter((item) => item.id !== session.id);
			sessions.push({ ...session, messages: [...session.messages] });
			return session;
		},
		appendMessage: async (workspaceId, sessionId, message) => {
			sessions = sessions.map((session) =>
				session.workspaceId === workspaceId && session.id === sessionId
					? { ...session, messages: [...session.messages, message], updatedAt: message.createdAt }
					: session
			);
		},
		recordFeedback: async (workspaceId, messageId, rating) => {
			sessions = sessions.map((session) =>
				session.workspaceId !== workspaceId
					? session
					: {
							...session,
							messages: session.messages.map((message) =>
								message.id === messageId ? { ...message, feedback: rating } : message
							),
						}
			);
		},
	},
	usage: {
		recordEvent: async (event: UsageEvent) => {
			usageRecords.push({
				...event,
				id: `usage_${Date.now()}_${usageRecords.length}`,
				createdAt: new Date().toISOString(),
			});
		},
		listEvents: async (workspaceId, limit = 100) =>
			usageRecords.filter((item) => item.workspaceId === workspaceId).slice(-limit).reverse(),
	},
	retrieval: new MemoryRetrievalService(),
};
