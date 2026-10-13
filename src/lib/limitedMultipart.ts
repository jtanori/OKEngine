export const MAX_PRIVATE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_PRIVATE_MULTIPART_BYTES = MAX_PRIVATE_UPLOAD_BYTES + 256 * 1024;

export class PayloadTooLargeError extends Error {
  constructor(message = 'Multipart body exceeds the upload limit') {
    super(message);
    this.name = 'PayloadTooLargeError';
  }
}

/**
 * Read a multipart request into memory only after enforcing a hard byte limit.
 * Next's `request.formData()` buffers the complete body, so checking `File.size`
 * after calling it is not enough to protect the server from oversized/chunked
 * requests with a missing or dishonest Content-Length header.
 */
export async function parseMultipartWithinLimit(
  request: Request,
  maxBytes = MAX_PRIVATE_MULTIPART_BYTES
): Promise<FormData> {
  const contentType = request.headers.get('content-type');
  if (!contentType?.toLowerCase().startsWith('multipart/form-data;')) {
    throw new Error('Expected multipart form data');
  }

  const reader = request.body?.getReader();
  if (!reader) throw new Error('Request body is missing');
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new PayloadTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const boundedRequest = new Request(request.url, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  });
  return boundedRequest.formData();
}
