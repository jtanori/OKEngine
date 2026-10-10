import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '../lib/supabase/server';
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

type DatabaseRow = Record<string, any>;

async function unwrap<T>(query: PromiseLike<any>): Promise<T> {
	const { data, error } = await query;
	if (error) throw new Error(error.message);
	return data as T;
}

function client(): SupabaseClient {
	const supabase = getSupabaseServerClient();
	if (!supabase) throw new Error('Supabase server client is not configured.');
	return supabase;
}

function toWorkspace(row: DatabaseRow): Workspace {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		publicKey: row.public_key,
		createdAt: row.created_at,
	};
}

function toCollection(row: DatabaseRow): Collection {
	return {
		id: row.id,
		workspaceId: row.workspace_id,
		name: row.name,
		description: row.description ?? '',
		visibility: row.visibility,
		fileCount: row.file_count ?? 0,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function toDocument(row: DatabaseRow): KnowledgeDocument {
	const filename = row.filename ?? '';
	const extension = filename.split('.').pop()?.toLowerCase();
	return {
		id: row.id,
		workspaceId: row.workspace_id,
		collectionId: row.collection_id,
		title: row.title,
		filename,
		content: row.content ?? '',
		type: extension === 'pdf' ? 'pdf' : extension === 'txt' ? 'text' : 'markdown',
		status: row.status === 'ready' ? 'ready' : row.status === 'failed' ? 'failed' : 'processing',
		fileSize: row.size_bytes ? `${Math.ceil(row.size_bytes / 1024)} KB` : '',
		nextStep:
			row.next_step_label && row.next_step_url
				? { label: row.next_step_label, url: row.next_step_url }
				: undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		indexedAt: row.indexed_at ?? row.updated_at,
		chunkCount: row.chunk_count ?? 0,
		deletedAt: row.deleted_at ?? undefined,
		language: row.language ?? undefined,
	};
}

function toEmbed(row: DatabaseRow): EmbedInstance {
	const knowledgeScope = row.knowledge_scope ?? {};
	const appearanceConfig = row.appearance_config ?? {};
	return {
		id: row.id,
		workspaceId: row.workspace_id,
		name: row.name,
		status: row.status,
		mode: row.mode,
		knowledgeScope,
		contextConfig: row.context_config ?? undefined,
		behaviorConfig: row.behavior_config ?? undefined,
		appearanceConfig,
		position: appearanceConfig.position === 'left' ? 'bottom-left' : 'bottom-right',
		accentColor: appearanceConfig.accentColor ?? '#1D4ED8',
		greetingText: row.greeting_text ?? '',
		placeholderText: row.placeholder_text ?? '',
		allowedCollectionIds: knowledgeScope.collectionIds ?? [],
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function toMessage(row: DatabaseRow): ChatMessage {
	return {
		id: row.id,
		role: row.sender,
		content: row.content,
		sources: row.sources ?? [],
		createdAt: row.created_at,
	};
}

function toChunk(
	row: DatabaseRow,
	document: KnowledgeDocument,
	visibility: Collection['visibility']
): DocumentChunk {
	return {
		id: row.id,
		documentId: row.document_id,
		collectionId: row.collection_id,
		collectionVisibility: visibility,
		documentTitle: document.title,
		filename: document.filename,
		content: row.content,
		embedding: row.embedding ?? undefined,
	};
}

function rankChunks(
	query: AuthorizedRetrievalQuery,
	documents: KnowledgeDocument[],
	chunksByDocument: Map<string, DocumentChunk[]>
): RetrievedChunkResult[] {
	const terms = query.query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
	const results = documents.flatMap((document) =>
		(chunksByDocument.get(document.id) ?? []).map((chunk) => {
			const content = chunk.content.toLowerCase();
			const matches = terms.filter((term) => content.includes(term)).length;
			return {
				chunkId: chunk.id,
				documentId: document.id,
				collectionId: document.collectionId,
				title: document.title,
				filename: document.filename,
				headingPath: document.title,
				content: chunk.content,
				language: document.language ?? 'en',
				score: terms.length ? matches / terms.length : 0,
			};
		})
	);
	return results
		.filter((item) => item.score > 0)
		.sort((left, right) => right.score - left.score)
		.slice(0, query.limit ?? 6);
}

export const supabaseRepositories: RepositoryRegistry = {
	workspaces: {
		getBySlug: async (slug) => {
			const row = await unwrap<DatabaseRow | null>(
				client().from('workspaces').select('*').eq('slug', slug).maybeSingle()
			);
			return row ? toWorkspace(row) : null;
		},
		getById: async (id) => {
			const row = await unwrap<DatabaseRow | null>(
				client().from('workspaces').select('*').eq('id', id).maybeSingle()
			);
			return row ? toWorkspace(row) : null;
		},
		updateSettings: async (id, patch) => {
			const values: DatabaseRow = {};
			if (patch.name !== undefined) values.name = patch.name;
			if (patch.slug !== undefined) values.slug = patch.slug;
			if (patch.publicKey !== undefined) values.public_key = patch.publicKey;
			const row = await unwrap<DatabaseRow | null>(
				client().from('workspaces').update(values).eq('id', id).select('*').maybeSingle()
			);
			return row ? toWorkspace(row) : null;
		},
	},
	collections: {
		listByWorkspace: async (workspaceId, allowedVisibility) => {
			let query = client().from('collections').select('*').eq('workspace_id', workspaceId);
			if (allowedVisibility?.length) query = query.in('visibility', allowedVisibility);
			const rows = await unwrap<DatabaseRow[]>(query);
			return rows.map(toCollection);
		},
		getById: async (workspaceId, collectionId) => {
			const row = await unwrap<DatabaseRow | null>(
				client()
					.from('collections')
					.select('*')
					.eq('workspace_id', workspaceId)
					.eq('id', collectionId)
					.maybeSingle()
			);
			return row ? toCollection(row) : null;
		},
		create: async (collection) => {
			const row = await unwrap<DatabaseRow>(
				client()
					.from('collections')
					.insert({
						id: collection.id,
						workspace_id: collection.workspaceId,
						name: collection.name,
						description: collection.description,
						visibility: collection.visibility,
					})
					.select('*')
					.single()
			);
			return toCollection(row);
		},
		update: async (workspaceId, collectionId, patch) => {
			const values: DatabaseRow = {};
			if (patch.name !== undefined) values.name = patch.name;
			if (patch.description !== undefined) values.description = patch.description;
			if (patch.visibility !== undefined) values.visibility = patch.visibility;
			const row = await unwrap<DatabaseRow | null>(
				client()
					.from('collections')
					.update(values)
					.eq('workspace_id', workspaceId)
					.eq('id', collectionId)
					.select('*')
					.maybeSingle()
			);
			return row ? toCollection(row) : null;
		},
	},
	documents: {
		listAuthorized: async ({ workspaceId, authorizedCollectionIds, narrowedDocumentIds }) => {
			if (!authorizedCollectionIds.length) return [];
			let query = client()
				.from('documents')
				.select('*')
				.eq('workspace_id', workspaceId)
				.in('collection_id', authorizedCollectionIds)
				.eq('status', 'ready')
				.is('deleted_at', null);
			if (narrowedDocumentIds?.length) query = query.in('id', narrowedDocumentIds);
			const rows = await unwrap<DatabaseRow[]>(query);
			return rows.map(toDocument);
		},
		getById: async (workspaceId, documentId) => {
			const row = await unwrap<DatabaseRow | null>(
				client()
					.from('documents')
					.select('*')
					.eq('workspace_id', workspaceId)
					.eq('id', documentId)
					.is('deleted_at', null)
					.maybeSingle()
			);
			return row ? toDocument(row) : null;
		},
		upsertDocument: async (document) => {
			const row = await unwrap<DatabaseRow>(
				client()
					.from('documents')
					.upsert(
						{
							id: document.id,
							workspace_id: document.workspaceId,
							collection_id: document.collectionId,
							title: document.title,
							filename: document.filename,
							content: document.content,
							status: document.status,
							next_step_label: document.nextStep?.label ?? null,
							next_step_url: document.nextStep?.url ?? null,
							chunk_count: document.chunkCount,
							created_at: document.createdAt,
							updated_at: document.updatedAt,
							indexed_at: document.indexedAt,
							deleted_at: document.deletedAt ?? null,
						},
						{ onConflict: 'id' }
					)
					.select('*')
					.single()
			);
			return toDocument(row);
		},
		softDeleteDocument: async (workspaceId, documentId) => {
			await unwrap(
				client()
					.from('documents')
					.update({ status: 'deleted', deleted_at: new Date().toISOString() })
					.eq('workspace_id', workspaceId)
					.eq('id', documentId)
			);
		},
		listChunksByDocument: async (workspaceId, documentId) => {
			const document = await supabaseRepositories.documents.getById(workspaceId, documentId);
			if (!document) return [];
			const [collection, rows] = await Promise.all([
				unwrap<DatabaseRow | null>(
					client()
						.from('collections')
						.select('*')
						.eq('workspace_id', workspaceId)
						.eq('id', document.collectionId)
						.maybeSingle()
				),
				unwrap<DatabaseRow[]>(
					client().from('document_chunks').select('*').eq('workspace_id', workspaceId).eq('document_id', documentId)
				),
			]);
			return rows.map((row) => toChunk(row, document, collection?.visibility ?? 'everyone'));
		},
		replaceDocumentChunks: async (workspaceId, documentId, collectionId, chunks) => {
			await unwrap(
				client()
					.from('document_chunks')
					.delete()
					.eq('workspace_id', workspaceId)
					.eq('document_id', documentId)
			);
			if (chunks.length) {
				await unwrap(
					client().from('document_chunks').insert(
						chunks.map((chunk, index) => ({
							id: chunk.id,
							workspace_id: workspaceId,
							collection_id: collectionId,
							document_id: documentId,
							chunk_index: index,
							content: chunk.content,
							token_count: chunk.content.split(/\s+/).length,
						}))
					)
				);
			}
			await unwrap(
				client()
					.from('documents')
					.update({ chunk_count: chunks.length, updated_at: new Date().toISOString() })
					.eq('workspace_id', workspaceId)
					.eq('id', documentId)
			);
		},
	},
	embeds: {
		listByWorkspace: async (workspaceId) => {
			const rows = await unwrap<DatabaseRow[]>(
				client().from('embeds').select('*').eq('workspace_id', workspaceId)
			);
			return rows.map(toEmbed);
		},
		getById: async (workspaceId, embedId) => {
			const row = await unwrap<DatabaseRow | null>(
				client()
					.from('embeds')
					.select('*')
					.eq('workspace_id', workspaceId)
					.eq('id', embedId)
					.maybeSingle()
			);
			return row ? toEmbed(row) : null;
		},
		upsertEmbed: async (embed) => {
			const row = await unwrap<DatabaseRow>(
				client()
					.from('embeds')
					.upsert(
						{
							id: embed.id,
							workspace_id: embed.workspaceId,
							name: embed.name,
							status: embed.status ?? 'draft',
							mode: embed.mode ?? 'widget',
							knowledge_scope: embed.knowledgeScope ?? { collectionIds: embed.allowedCollectionIds },
							context_config: embed.contextConfig ?? {},
							behavior_config: embed.behaviorConfig ?? {},
							appearance_config: embed.appearanceConfig ?? { accentColor: embed.accentColor },
							created_at: embed.createdAt,
							updated_at: embed.updatedAt,
						},
						{ onConflict: 'id' }
					)
					.select('*')
					.single()
			);
			return toEmbed(row);
		},
	},
	conversations: {
		listSessions: async (workspaceId) => {
			const rows = await unwrap<DatabaseRow[]>(
				client().from('conversations').select('*').eq('workspace_id', workspaceId).order('created_at')
			);
			const sessions = await Promise.all(
				rows.map(async (row) => {
					const messageRows = await unwrap<DatabaseRow[]>(
						client()
							.from('conversation_messages')
							.select('*')
							.eq('workspace_id', workspaceId)
							.eq('conversation_id', row.id)
							.order('created_at')
					);
					return {
						id: row.id,
						workspaceId: row.workspace_id,
						userId: row.user_id ?? '',
						role: row.simulated_role,
						currentUrl: row.current_url,
						messages: messageRows.map(toMessage),
						createdAt: row.created_at,
						updatedAt: messageRows.at(-1)?.created_at ?? row.created_at,
					} satisfies ChatSession;
				})
			);
			return sessions;
		},
		createSession: async (session) => {
			await unwrap(
				client().from('conversations').insert({
					id: session.id,
					workspace_id: session.workspaceId,
					simulated_role: session.role,
					current_url: session.currentUrl,
					created_at: session.createdAt,
				})
			);
			if (session.messages.length) {
				await unwrap(
					client().from('conversation_messages').insert(
						session.messages.map((message) => ({
							id: message.id,
							workspace_id: session.workspaceId,
							conversation_id: session.id,
							sender: message.role,
							content: message.content,
							sources: message.sources ?? [],
							created_at: message.createdAt,
						}))
					)
				);
			}
			return session;
		},
		appendMessage: async (workspaceId, sessionId, message) => {
			await unwrap(
				client().from('conversation_messages').insert({
					id: message.id,
					workspace_id: workspaceId,
					conversation_id: sessionId,
					sender: message.role,
					content: message.content,
					sources: message.sources ?? [],
					created_at: message.createdAt,
				})
			);
		},
		recordFeedback: async (workspaceId, messageId, rating) => {
			const message = await unwrap<DatabaseRow | null>(
				client()
					.from('conversation_messages')
					.select('conversation_id')
					.eq('workspace_id', workspaceId)
					.eq('id', messageId)
					.maybeSingle()
			);
			if (!message) return;
			await unwrap(
				client()
					.from('conversations')
					.update({ feedback: rating })
					.eq('workspace_id', workspaceId)
					.eq('id', message.conversation_id)
			);
		},
	},
	usage: {
		recordEvent: async (event: UsageEvent) => {
			await unwrap(
				client().from('usage_records').insert({
					id: `usage_${crypto.randomUUID()}`,
					workspace_id: event.workspaceId,
					event_type: event.eventType,
					answer_mode: event.answerMode ?? 'deterministic',
					tokens_used: event.tokensUsed ?? 0,
					latency_ms: event.latencyMs ?? 0,
				})
			);
		},
		listEvents: async (workspaceId, limit = 100) => {
			const rows = await unwrap<DatabaseRow[]>(
				client()
					.from('usage_records')
					.select('*')
					.eq('workspace_id', workspaceId)
					.order('created_at', { ascending: false })
					.limit(limit)
			);
			return rows.map((row) => ({
				id: row.id,
				workspaceId: row.workspace_id,
				eventType: row.event_type,
				answerMode: row.answer_mode,
				tokensUsed: row.tokens_used,
				latencyMs: row.latency_ms,
				createdAt: row.created_at,
			}));
		},
	},
	retrieval: {
		retrieveAuthorizedChunks: async (query: AuthorizedRetrievalQuery) => {
			const documents = await supabaseRepositories.documents.listAuthorized(query);
			const chunksByDocument = new Map<string, DocumentChunk[]>();
			await Promise.all(
				documents.map(async (document) => {
					chunksByDocument.set(
						document.id,
						await supabaseRepositories.documents.listChunksByDocument(
							query.workspaceId,
							document.id
						)
					);
				})
			);
			return rankChunks(query, documents, chunksByDocument);
		},
	},
};
