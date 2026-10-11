import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseMultipartWithinLimit, PayloadTooLargeError } from '../../src/lib/limitedMultipart';

test('private Storage multipart upload is bounded before FormData parsing', async (t) => {
  await t.test('parses a valid multipart body below its configured limit', async () => {
    const form = new FormData();
    form.set('collectionId', 'col_test');
    form.set('file', new File(['private fixture'], 'notes.txt', { type: 'text/plain' }));
    const request = new Request('http://localhost/upload', { method: 'POST', body: form });

    const parsed = await parseMultipartWithinLimit(request, 4096);
    assert.equal(parsed.get('collectionId'), 'col_test');
    const file = parsed.get('file');
    assert.ok(file instanceof File);
    assert.equal(file.name, 'notes.txt');
  });

  await t.test('rejects an oversized chunked body and cancels the source stream', async () => {
    let pullCount = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pullCount += 1;
        controller.enqueue(new Uint8Array(16));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request('http://localhost/upload', {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=test-boundary' },
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    await assert.rejects(
      parseMultipartWithinLimit(request, 32),
      PayloadTooLargeError,
    );
    assert.equal(cancelled, true);
    assert.ok(pullCount <= 3, `stream was read ${pullCount} times before cancellation`);
  });

  await t.test('rejects a non-multipart request before reading its body', async () => {
    const request = new Request('http://localhost/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    await assert.rejects(parseMultipartWithinLimit(request), /Expected multipart form data/);
  });
});
