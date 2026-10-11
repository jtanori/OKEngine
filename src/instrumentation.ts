// src/instrumentation.ts — Next.js instrumentation for graceful shutdown (OPS-GRACEFUL-01)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateStartupDataMode } = await import('./repositories');
    validateStartupDataMode();

    const { closePool } = await import('./lib/db');
    const { closeRedis } = await import('./lib/redis');

    const shutdown = async (signal: string) => {
      console.log(`[instrumentation] Received ${signal}, shutting down...`);
      try {
        await closePool();
        await closeRedis();
        console.log('[instrumentation] Shutdown complete');
      } catch (err) {
        console.error('[instrumentation] Shutdown error', err);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}
