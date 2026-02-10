import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | null = null;

export function initTracing(): void {
  if (sdk) return;

  const endpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
  if (!endpoint) {
    console.log('[tracing] OTEL_EXPORTER_OTLP_ENDPOINT not set, skipping OTel init');
    return;
  }

  const serviceName = process.env['OTEL_SERVICE_NAME'] ?? 'employmentx-web';
  const serviceVersion = process.env['APP_VERSION'] ?? '0.0.0';

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
    }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
  });

  sdk.start();
  console.log(`[tracing] OTel SDK started: ${serviceName}@${serviceVersion} → ${endpoint}`);

  process.on('SIGTERM', () => {
    sdk?.shutdown().catch(console.error);
  });
}

export function shutdownTracing(): Promise<void> {
  if (!sdk) return Promise.resolve();
  return sdk.shutdown();
}
