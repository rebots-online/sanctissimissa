/**
 * Chat session adapter (CP.5): ChatController over a deterministic mock
 * IInferenceEngine. CP.3 (WebGPU TurboQuant) and CP.4 (registry) plug in
 * behind the same reusable-chatbot interface — no UI change.
 */

import { ChatController } from '../../../reusable-chatbot/core/chat-controller.ts';
import type {
  EngineCapabilities,
  EngineConfig,
  GenerateRequest,
  IInferenceEngine,
  KvCacheStats,
  SessionId,
} from '../../../reusable-chatbot/core/engine-types.ts';

/**
 * Deterministic stand-in formulas — rotated per turn so the preview reads
 * alive instead of one canned string. No RNG: the sequence is identical
 * every run, and every formula echoes the user's topic. CP.3 replaces the
 * whole engine.
 */
const REPLY_FORMULAS: ((topic: string) => string)[] = [
  (topic) =>
    [
      '℣. Dóminus vobíscum.',
      `You bring «${topic}» before the altar.`,
      'Hold it in silence a moment; grace works where words end.',
      '✠ Ad iuvándum me, Deus meus, inténde.',
    ].join(' '),
  (topic) =>
    [
      '℣. Benedícat vos omnípotens Deus.',
      `Let «${topic}» rest beside the missal a while.`,
      'The Church prays first, and understanding follows at her pace.',
      '✠ In nómine Patris, et Fílii, et Spíritus Sancti.',
    ].join(' '),
  (topic) =>
    [
      '℣. Lex orandi, lex credendi.',
      `«${topic}» is carried in the liturgy tonight.`,
      'What the rites hold, the heart learns by heart — the stand-in engine merely bows.',
      '✠ Confírma hoc, Deus, quod operátus es in nobis.',
    ].join(' '),
  (topic) =>
    [
      '℣. Introíbo ad altáre Dei.',
      `You carry «${topic}» up the sanctuary steps.`,
      'Grace goes before the answer, as the Gloria goes before the Credo.',
      '✠ Ad iuvándum me, Deus meus, inténde.',
    ].join(' '),
];

export class MockEngine implements IInferenceEngine {
  readonly chunkDelayMs: number;
  private turn = 0;

  constructor({ chunkDelayMs = 0 }: { chunkDelayMs?: number } = {}) {
    this.chunkDelayMs = chunkDelayMs;
  }

  async probe(): Promise<EngineCapabilities> {
    return {
      runtime: 'web',
      backend: 'wasm-simd',
      kvFormats: [],
      weightFormats: [],
      notes: ['deterministic mock engine — CP.3 WebGPU TurboQuant plugs in here'],
    };
  }

  async init(_config: EngineConfig): Promise<SessionId> {
    return 'mock-session';
  }

  private reply(messages: GenerateRequest['messages']): string {
    const last = messages.filter((m) => m.role === 'user').at(-1)?.content.trim() ?? '';
    const topic = last.length > 0 ? last.replace(/\s+/g, ' ').slice(0, 120) : 'the sacred liturgy';
    return REPLY_FORMULAS[this.turn++ % REPLY_FORMULAS.length](topic);
  }

  async *generate(
    _session: SessionId,
    request: GenerateRequest,
    signal?: AbortSignal,
  ): AsyncIterable<{ text: string }> {
    for (const piece of this.reply(request.messages).split(/(?<= )/)) {
      if (signal?.aborted) return;
      if (this.chunkDelayMs > 0) await new Promise((r) => setTimeout(r, this.chunkDelayMs));
      yield { text: piece };
    }
  }

  async batchScore(): Promise<Float32Array> {
    return new Float32Array(0);
  }

  async kvStats(): Promise<KvCacheStats> {
    return { tokens: 0, bytes: 0, bytesPerToken: 0, compressed: false };
  }

  async reset(): Promise<void> {}

  async close(): Promise<void> {}
}

export interface ChatSession {
  controller: ChatController;
  engine: MockEngine;
  ensureEngine(): Promise<void>;
  /** Deterministic mock model id — CP.4 replaces this with a registry pick. */
  readonly modelId: string;
}

export function createChatSession(): ChatSession {
  const engine = new MockEngine();
  const controller = new ChatController();
  const config: EngineConfig = {
    modelId: 'mock://liturgibot-preview',
    artifactUrl: 'builtin:',
  };
  let ready: Promise<void> | null = null;
  return {
    controller,
    engine,
    modelId: config.modelId,
    ensureEngine() {
      ready ??= controller.useEngine(engine, config).then(() => undefined);
      return ready;
    },
  };
}
