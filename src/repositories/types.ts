import type {
	AccessVisibility,
	ChatMessage,
	ChatSession,
	Collection,
	DocumentChunk,
	EmbedInstance,
	KnowledgeDocument,
	SupportedLanguage,
	Workspace,
} from '../types';
import type { AnswerMode } from '../services/engine/responseCompiler';

export interface AuthorizedRetrievalQuery {
	workspaceId: string;
	query: string;
	authorizedCollectionIds: string[];
	narrowedDocumentIds?: string[];
	queryEmbedding?: number[];
	limit?: number;
	language?: SupportedLanguage;
}

export interface RetrievedChunkResult {
	chunkId: string;
	documentId: string;
	collectionId: string;
	title: string;
	filename: string;
	headingPath: string;
	content: string;
	language: SupportedLanguage;
	score: number;
	routeContext?: string;
}

export interface RetrievalService {
	retrieveAuthorizedChunks(query: AuthorizedRetrievalQuery): Promise<RetrievedChunkResult[]>;
}

export interface UsageEvent {
	workspaceId: string;
	eventType: 'retrieval_query' | 'file_ingestion' | 'embed_load';
	answerMode?: AnswerMode;
	tokensUsed?: number;
	latencyMs?: number;
}

export interface UsageRecord extends UsageEvent {
	id: string;
	createdAt: string;
}

export interface RepositoryRegistry {
	workspaces: {
		getBySlug(slug: string): Promise<Workspace | null>;
		getById(id: string): Promise<Workspace | null>;
		updateSettings(id: string, patch: Partial<Workspace>): Promise<Workspace | null>;
	};
	collections: {
		listByWorkspace(
			workspaceId: string,
			allowedVisibility?: AccessVisibility[]
		): Promise<Collection[]>;
		getById(workspaceId: string, collectionId: string): Promise<Collection | null>;
		create(collection: Collection): Promise<Collection>;
		update(
			workspaceId: string,
			collectionId: string,
			patch: Partial<Collection>
		): Promise<Collection | null>;
	};
	documents: {
		listAuthorized(params: {
			workspaceId: string;
			authorizedCollectionIds: string[];
			narrowedDocumentIds?: string[];
		}): Promise<KnowledgeDocument[]>;
		getById(workspaceId: string, documentId: string): Promise<KnowledgeDocument | null>;
		upsertDocument(document: KnowledgeDocument): Promise<KnowledgeDocument>;
		softDeleteDocument(workspaceId: string, documentId: string): Promise<void>;
		listChunksByDocument(workspaceId: string, documentId: string): Promise<DocumentChunk[]>;
		replaceDocumentChunks(
			workspaceId: string,
			documentId: string,
			collectionId: string,
			chunks: DocumentChunk[]
		): Promise<void>;
	};
	embeds: {
		listByWorkspace(workspaceId: string): Promise<EmbedInstance[]>;
		getById(workspaceId: string, embedId: string): Promise<EmbedInstance | null>;
		upsertEmbed(embed: EmbedInstance): Promise<EmbedInstance>;
	};
	conversations: {
		listSessions(workspaceId: string): Promise<ChatSession[]>;
		createSession(session: ChatSession): Promise<ChatSession>;
		appendMessage(workspaceId: string, sessionId: string, message: ChatMessage): Promise<void>;
		recordFeedback(workspaceId: string, messageId: string, rating: 'up' | 'down'): Promise<void>;
	};
	usage: {
		recordEvent(event: UsageEvent): Promise<void>;
		listEvents(workspaceId: string, limit?: number): Promise<UsageRecord[]>;
	};
	retrieval: RetrievalService;
}
