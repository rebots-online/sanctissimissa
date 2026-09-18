// One chatbot semantics layer over every engine backend. Liturgibot (and any
// other consumer) talks to this controller; the controller probes, selects,
// streams and recovers. GPU/device loss is not application state: on engine
// loss the consumer re-runs useEngine() and the canonical history re-prefills.
import type {
  ChatMsg,
  EngineCapabilities,
  EngineConfig,
  GenerateRequest,
  IInferenceEngine,
  SessionId,
  TokenEvent,
} from './engine-types.ts';

export class ChatController {
  #engine: IInferenceEngine | null = null;
  #session: SessionId | null = null;
  #capabilities: EngineCapabilities | null = null;
  readonly #history: ChatMsg[] = [];

  /** Probe, then open a session on the given engine. Closes any previous one. */
  async useEngine(engine: IInferenceEngine, config: EngineConfig): Promise<EngineCapabilities> {
    await this.close();
    const capabilities = await engine.probe();
    this.#session = await engine.init(config);
    this.#engine = engine;
    this.#capabilities = capabilities;
    return capabilities;
  }

  get capabilities(): EngineCapabilities | null {
    return this.#capabilities;
  }

  get history(): readonly ChatMsg[] {
    return this.#history;
  }

  /** Stream one assistant turn; canonical history grows even on abort. */
  async *generate(userText: string, signal?: AbortSignal, systemContext?: string): AsyncGenerator<TokenEvent, void, undefined> {
    if (!this.#engine || this.#session === null) {
      throw new Error('ChatController: no engine session — call useEngine() first');
    }
    const request: GenerateRequest = {
      messages: [...(systemContext ? [{ role: 'system' as const, content: systemContext }] : []), ...this.#history, { role: 'user', content: userText }],
    };
    this.#history.push({ role: 'user', content: userText });
    let assistant = '';
    try {
      for await (const event of this.#engine.generate(this.#session, request, signal)) {
        assistant += event.text;
        yield event;
      }
    } finally {
      if (assistant) this.#history.push({ role: 'assistant', content: assistant });
    }
  }

  /** Drop KV state and conversation; the session stays open for re-prefill. */
  async reset(): Promise<void> {
    this.#history.length = 0;
    if (this.#engine && this.#session !== null) await this.#engine.reset(this.#session);
  }

  async close(): Promise<void> {
    if (this.#engine && this.#session !== null) await this.#engine.close(this.#session);
    this.#engine = null;
    this.#session = null;
    this.#capabilities = null;
    this.#history.length = 0;
  }
}
