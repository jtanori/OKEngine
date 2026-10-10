import express from 'express';

export const BYTE_CAP_16KB = 16 * 1024;
export const BYTE_CAP_64KB = 64 * 1024;
export const BYTE_CAP_256KB = 256 * 1024;
export const BYTE_CAP_10MB = 10 * 1024 * 1024;

const FORBIDDEN_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const FORBIDDEN_CORPUS_KEYS = new Set([
  'documents',
  'collections',
  'embeds',
  'contextChunks',
  'allowedCollectionIds',
  'targetScopeCollectionIds',
  'allowedDocumentIds',
  'verificationMode',
  'roleKind',
  'signingSecret',
  'requireSignedToken',
]);

/**
 * Recursively checks an object or array for prototype-pollution keys
 * using Object.prototype.hasOwnProperty.
 */
export function containsPrototypePollutionKey(value: unknown, depth = 0): boolean {
  if (depth > 24 || value === null || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (containsPrototypePollutionKey(item, depth + 1)) return true;
    }
    return false;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.getOwnPropertyNames(obj)) {
    if (FORBIDDEN_PROTO_KEYS.has(key)) {
      return true;
    }
    if (containsPrototypePollutionKey(obj[key], depth + 1)) {
      return true;
    }
  }
  return false;
}

/**
 * Recursively scans nested objects for forbidden client corpus or privilege escalation keys.
 */
export function findForbiddenNestedKey(value: unknown, depth = 0): string | null {
  if (depth > 24 || value === null || typeof value !== 'object') {
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findForbiddenNestedKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (depth > 0 && FORBIDDEN_CORPUS_KEYS.has(key)) {
      return key;
    }
    const nested = findForbiddenNestedKey(obj[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

/**
 * Stage 1 Pre-Parse Content-Encoding & Multi-Chunk Stream Byte Limit Parser.
 * Executes as the very first middleware on each route before any auth, session, DB, or LLM work.
 */
export function createBoundedJsonParser(
  maxBytes: number = BYTE_CAP_64KB,
  options?: { allowEmptyBody?: boolean }
): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // 1. Reject non-identity Content-Encoding (compression bomb protection)
    const contentEncoding = String(req.headers['content-encoding'] || '')
      .trim()
      .toLowerCase();
    if (contentEncoding && contentEncoding !== 'identity') {
      res.status(415).json({
        ok: false,
        status: 415,
        error: 'UNSUPPORTED_CONTENT_ENCODING',
        code: 'UNSUPPORTED_CONTENT_ENCODING',
        message: 'Compressed request bodies (gzip/br/deflate) are not accepted; use identity encoding.',
      });
      return;
    }

    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD') {
      req.body = {};
      next();
      return;
    }

    // 2. Enforce Content-Type: application/json
    const contentType = String(req.headers['content-type'] || '')
      .trim()
      .toLowerCase();
    const contentLengthHeader = req.headers['content-length'];
    const declaredLength =
      contentLengthHeader !== undefined ? Number(contentLengthHeader) : undefined;

    if (!contentType.startsWith('application/json')) {
      if (options?.allowEmptyBody && (declaredLength === 0 || (!contentType && declaredLength === undefined))) {
        req.body = {};
        next();
        return;
      }
      res.status(415).json({
        ok: false,
        status: 415,
        error: 'UNSUPPORTED_MEDIA_TYPE',
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content-Type must be application/json.',
      });
      return;
    }

    // If Content-Length already exceeds maxBytes, reject before reading stream
    if (declaredLength !== undefined && Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      res.status(413).json({
        ok: false,
        status: 413,
        error: 'PAYLOAD_TOO_LARGE',
        code: 'PAYLOAD_TOO_LARGE',
        maxBytes,
        message: `Request payload exceeds route limit of ${maxBytes} bytes.`,
      });
      return;
    }

    // If body was already parsed by an earlier test harness, still enforce byte & prototype rules
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0 && req.readableEnded) {
      const serializedBytes = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
      if (serializedBytes > maxBytes) {
        res.status(413).json({
          ok: false,
          status: 413,
          error: 'PAYLOAD_TOO_LARGE',
          code: 'PAYLOAD_TOO_LARGE',
          maxBytes,
        });
        return;
      }
      if (containsPrototypePollutionKey(req.body)) {
        res.status(400).json({
          ok: false,
          status: 400,
          error: 'SCHEMA_INVALID_PAYLOAD',
          code: 'SCHEMA_INVALID_PAYLOAD',
          message: 'Forbidden prototype-pollution key detected.',
        });
        return;
      }
      next();
      return;
    }

    // 3. Multi-chunk stream byte counting prior to buffering/JSON parsing
    const chunks: Buffer[] = [];
    let actualBytesRead = 0;
    let aborted = false;

    const onData = (chunk: Buffer | string) => {
      if (aborted) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8');
      actualBytesRead += buf.byteLength;

      if (actualBytesRead > maxBytes) {
        aborted = true;
        chunks.length = 0;
        req.removeListener('data', onData);
        req.removeListener('end', onEnd);
        req.removeListener('error', onError);
        req.resume(); // Drain remaining socket bytes safely without buffering
        if (!res.headersSent) {
          res.status(413).json({
            ok: false,
            status: 413,
            error: 'PAYLOAD_TOO_LARGE',
            code: 'PAYLOAD_TOO_LARGE',
            maxBytes,
            actualBytesRead,
            message: `Streamed payload exceeded route byte cap (${maxBytes} bytes).`,
          });
        }
        return;
      }

      chunks.push(buf);
    };

    const onEnd = () => {
      if (aborted || res.headersSent) return;
      if (actualBytesRead === 0) {
        req.body = {};
        next();
        return;
      }

      const rawText = Buffer.concat(chunks, actualBytesRead).toString('utf8');

      // Raw text scan for explicit "__proto__", "constructor", or "prototype" object keys
      // because JSON.parse strips or evaluates __proto__ before Object.keys sees it!
      if (/["'](?:__proto__|constructor|prototype)["']\s*:/.test(rawText)) {
        res.status(400).json({
          ok: false,
          status: 400,
          error: 'SCHEMA_INVALID_PAYLOAD',
          code: 'SCHEMA_INVALID_PAYLOAD',
          message: 'Prototype-pollution key (__proto__, constructor, prototype) rejected.',
        });
        return;
      }

      try {
        const parsed = JSON.parse(rawText);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          res.status(400).json({
            ok: false,
            status: 400,
            error: 'SCHEMA_INVALID_PAYLOAD',
            code: 'SCHEMA_INVALID_PAYLOAD',
            message: 'JSON body must be an object.',
          });
          return;
        }
        if (containsPrototypePollutionKey(parsed)) {
          res.status(400).json({
            ok: false,
            status: 400,
            error: 'SCHEMA_INVALID_PAYLOAD',
            code: 'SCHEMA_INVALID_PAYLOAD',
            message: 'Prototype-pollution key rejected.',
          });
          return;
        }
        req.body = parsed;
        next();
      } catch {
        res.status(400).json({
          ok: false,
          status: 400,
          error: 'SCHEMA_INVALID_PAYLOAD',
          code: 'SCHEMA_INVALID_PAYLOAD',
          message: 'Malformed JSON request body.',
        });
      }
    };

    const onError = () => {
      if (aborted || res.headersSent) return;
      aborted = true;
      res.status(400).json({
        ok: false,
        status: 400,
        error: 'SCHEMA_INVALID_PAYLOAD',
        code: 'SCHEMA_INVALID_PAYLOAD',
        message: 'Stream error while reading request body.',
      });
    };

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
  };
}

/**
 * Unconditionally rejects any legacy spoofable identity header or query parameter.
 */
export function rejectSpoofedIdentityHeaders(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const hasSpoofedUserHeader = req.headers['x-okeng-session-user'] !== undefined;
  const hasSpoofedSessionHeader = req.headers['x-okeng-session'] !== undefined;
  const hasSpoofedGrantHeader = req.headers['x-okeng-admin-grant'] !== undefined;
  const hasSpoofedQueryUser = req.query && req.query.sessionUser !== undefined;

  if (
    hasSpoofedUserHeader ||
    hasSpoofedSessionHeader ||
    hasSpoofedGrantHeader ||
    hasSpoofedQueryUser
  ) {
    res.status(401).json({
      ok: false,
      status: 401,
      error: 'SPOOFED_IDENTITY_HEADER_REJECTED',
      code: 'SPOOFED_IDENTITY_HEADER_REJECTED',
      message: 'Legacy spoofable identity headers and sessionUser query parameters are prohibited.',
    });
    return;
  }

  next();
}

/**
 * Strict schema allowlist validator for `req.body` and `req.query`.
 * Rejects any unrecognized top-level key or nested corpus key with `400 SCHEMA_UNKNOWN_FIELD`,
 * and any prototype-pollution key with `400 SCHEMA_INVALID_PAYLOAD`.
 */
export function validateStrictSchema(params: {
  allowedBodyKeys?: ReadonlyArray<string>;
  allowedQueryKeys?: ReadonlyArray<string>;
}): express.RequestHandler {
  const bodyAllowSet = new Set(params.allowedBodyKeys || []);
  const queryAllowSet = new Set(params.allowedQueryKeys || []);

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Check spoofed identity headers/query first so ?sessionUser= always yields 401 SPOOFED_IDENTITY_HEADER_REJECTED
    if (
      req.headers['x-okeng-session-user'] !== undefined ||
      req.headers['x-okeng-session'] !== undefined ||
      req.headers['x-okeng-admin-grant'] !== undefined ||
      (req.query && req.query.sessionUser !== undefined)
    ) {
      res.status(401).json({
        ok: false,
        status: 401,
        error: 'SPOOFED_IDENTITY_HEADER_REJECTED',
        code: 'SPOOFED_IDENTITY_HEADER_REJECTED',
        message: 'Legacy spoofable identity headers and sessionUser query parameters are prohibited.',
      });
      return;
    }

    if (req.query && typeof req.query === 'object') {
      if (containsPrototypePollutionKey(req.query)) {
        res.status(400).json({
          ok: false,
          status: 400,
          error: 'SCHEMA_INVALID_PAYLOAD',
          code: 'SCHEMA_INVALID_PAYLOAD',
          message: 'Prototype-pollution query key rejected.',
        });
        return;
      }
      for (const qKey of Object.keys(req.query)) {
        if (FORBIDDEN_PROTO_KEYS.has(qKey)) {
          res.status(400).json({
            ok: false,
            status: 400,
            error: 'SCHEMA_INVALID_PAYLOAD',
            code: 'SCHEMA_INVALID_PAYLOAD',
          });
          return;
        }
        if (!queryAllowSet.has(qKey)) {
          res.status(400).json({
            ok: false,
            status: 400,
            error: 'SCHEMA_UNKNOWN_FIELD',
            code: 'SCHEMA_UNKNOWN_FIELD',
            unknownField: qKey,
            message: `Unrecognized query parameter: ${qKey}`,
          });
          return;
        }
      }
    }

    const body = req.body;
    if (body !== undefined && body !== null) {
      if (typeof body !== 'object' || Array.isArray(body) || containsPrototypePollutionKey(body)) {
        res.status(400).json({
          ok: false,
          status: 400,
          error: 'SCHEMA_INVALID_PAYLOAD',
          code: 'SCHEMA_INVALID_PAYLOAD',
          message: 'Invalid request payload structure.',
        });
        return;
      }

      for (const bKey of Object.keys(body)) {
        if (!bodyAllowSet.has(bKey)) {
          res.status(400).json({
            ok: false,
            status: 400,
            error: 'SCHEMA_UNKNOWN_FIELD',
            code: 'SCHEMA_UNKNOWN_FIELD',
            unknownField: bKey,
            message: `Unrecognized or forbidden request field: ${bKey}`,
          });
          return;
        }
      }

      const forbiddenNested = findForbiddenNestedKey(body);
      if (forbiddenNested) {
        res.status(400).json({
          ok: false,
          status: 400,
          error: 'SCHEMA_UNKNOWN_FIELD',
          code: 'SCHEMA_UNKNOWN_FIELD',
          unknownField: forbiddenNested,
          message: `Forbidden nested field: ${forbiddenNested}`,
        });
        return;
      }
    }

    next();
  };
}
