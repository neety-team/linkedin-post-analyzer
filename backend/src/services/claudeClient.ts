import Anthropic from '@anthropic-ai/sdk';
import { logUsage } from './claudeUsage';
import { sanearUnicode } from './textoSeguro';

// Single shared client + a thin wrapper that logs every messages.create
// to claude_usage_logs. Every Claude call in the app should go through
// this so the Usage page reflects reality. Streaming is supported via
// trackedStream() which records final usage after the stream completes.

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export function rawClient() {
  return client;
}

/**
 * Drop-in replacement for `client.messages.create(...)` for non-streaming
 * calls. Logs feature/model/tokens/cost to the DB on success. Errors
 * bubble up; failed calls aren't logged (no usage to record).
 */
export async function trackedCreate(
  feature: string,
  params: Anthropic.MessageCreateParamsNonStreaming
): Promise<Anthropic.Message> {
  // Sin medio emoji en el body: Anthropic lo tumba con 400 (textoSeguro.ts).
  const response = await client.messages.create(sanearUnicode(params));
  const usage: any = (response as any).usage || {};
  await logUsage({
    feature,
    model: params.model,
    input_tokens: usage.input_tokens || 0,
    output_tokens: usage.output_tokens || 0,
    cache_read_input_tokens: usage.cache_read_input_tokens,
    cache_creation_input_tokens: usage.cache_creation_input_tokens,
  });
  return response;
}

/**
 * Same idea for streaming. Returns the stream object directly so callers
 * can pipe deltas as before; usage is recorded in the background once the
 * stream resolves to a final message. Logging failure never breaks the
 * stream consumer.
 */
export function trackedStream(
  feature: string,
  params: Anthropic.MessageStreamParams
) {
  const stream = client.messages.stream(sanearUnicode(params));
  stream
    .finalMessage()
    .then((msg) => {
      const usage: any = (msg as any).usage || {};
      return logUsage({
        feature,
        model: params.model,
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cache_read_input_tokens: usage.cache_read_input_tokens,
        cache_creation_input_tokens: usage.cache_creation_input_tokens,
      });
    })
    .catch((err) => {
      console.warn(`[claudeClient/${feature}] stream usage log failed:`, err?.message);
    });
  return stream;
}
