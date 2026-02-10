import { trace, SpanStatusCode, type Span } from '@opentelemetry/api';

const TRACER_NAME = 'employmentx-web';

export function getTracer() {
  return trace.getTracer(TRACER_NAME);
}

export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      span.end();
    }
  });
}

export function spanAttributes(req: {
  method: string;
  url: string;
  headers: { get: (name: string) => string | null };
}) {
  return {
    'http.method': req.method,
    'http.url': req.url,
    'http.request_id': req.headers.get('x-request-id') ?? 'unknown',
  };
}
