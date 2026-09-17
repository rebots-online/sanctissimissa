/**
 * CP.9 browser provider (§7.8.2 Phase 1 web): WebLLM over WebGPU in the page.
 * Model weights come from WebLLM's own compiled-model manifest (its download
 * cache is self-managed in the origin's Cache Storage); the GGUF catalog in
 * the CP.3 store drives the NATIVE provider — the picker shows whichever
 * roster the current runtime can honestly execute. Dynamic import keeps the
 * browser-only module out of node/test paths.
 */

import type {
  EngineCapabilities,
  EngineConfig,
  GenerateRequest,
  IInferenceEngine,
  KvCacheStats,
  SessionId,
  TokenEvent,
} from '../../core/engine-types.ts';

/** Minimal structural shape of the WebLLM engine surface we use. */
interface WebLLMEngineLike {
  chat: {
    completions: {
      create(options: {
        messages: { role: string; content: string }[];
        stream?: boolean;
        max_tokens?: number;
        stop?: string[];
        stream_options?: { include_usage?: boolean };
      }): AsyncIterable<{
        choices?: { delta?: { content?: string } }[];
      }>;
    };
  };
  interruptGenerate(): void;
  resetChat(): Promise<void>;
  unload(): Promise<void>;
}

export interface WebLLMModule {
  hasModelInModelList(modelId: string): boolean;
  CreateMLCEngine(
    modelId: string,
    options?: { initProgressCallback?: (report: { progress?: number; text?: string }) => void },
  ): Promise<WebLLMEngineLike>;
  prebuiltAppConfig: {
    model_list: {
      model: string;
      model_id: string;
      vram_required_MB: number;
      low_resource_required?: boolean;
      overrides?: Record<string, unknown>;
    }[];
  };
}

export async function loadWebLLM(): Promise<WebLLMModule | null> {
  try {
    return (await import('@mlc-ai/web-llm')) as unknown as WebLLMModule;
  } catch {
    return null;
  }
}

export interface WebLlmCatalogEntry {
  id: string;
  displayName: string;
  bytes: number; // vram_required_MB → bytes (weights must fit the budget)
  lowResource: boolean;
}

/** Map WebLLM's prebuilt list into picker entries (chat/instruct text models). */
export function webllmEntries(module: WebLLMModule): WebLlmCatalogEntry[] {
  return module.prebuiltAppConfig.model_list
    .filter((m) => /-q4f16_1|-q4f32_1|-q4f16$/i.test(m.model_id) || m.low_resource_required === true)
    .map((m) => ({
      id: m.model_id,
      displayName: m.model_id
        .replace(/-MLC/, '')
        .replace(/-q4f16_1|-q4f32_1|-q4f16/i, '')
        .replace(/-/g, ' '),
      bytes: Math.round(m.vram_required_MB * 1024 * 1024),
      lowResource: m.low_resource_required === true,
    }))
    .sort((a, b) => a.bytes - b.bytes);
}

export class WebLlmRunnerProvider implements IInferenceEngine {
  #engine: WebLLMEngineLike | null = null;
  #module: WebLLMModule | null = null;
  #initProgress: ((fraction: number, text: string) => void) | null = null;

  constructor(onInitProgress?: (fraction: number, text: string) => void) {
    this.#initProgress = onInitProgress ?? null;
  }

  async probe(): Promise<EngineCapabilities> {
    const gpu =
      typeof navigator !== 'undefined' && 'gpu' in navigator
        ? await (navigator as unknown as { gpu: { requestAdapter(): Promise<unknown | null> } }).gpu.requestAdapter()
        : null;
    if (!gpu) {
      return {
        runtime: 'web',
        backend: 'wasm-simd',
        kvFormats: [],
        weightFormats: [],
        notes: ['no WebGPU adapter — honest unsupported, no degraded pretend mode (guide §8)'],
      };
    }
    return {
      runtime: 'web',
      backend: 'webgpu',
      kvFormats: ['f16'],
      weightFormats: ['q4f16_1', 'q4f32_1'],
      notes: ['WebLLM worker engine — weights stream from the compiled-model manifest'],
    };
  }

  async init(config: EngineConfig): Promise<SessionId> {
    const module = this.#module ?? (await loadWebLLM());
    if (!module) throw new Error('WebLLM unavailable in this runtime');
    if (!module.hasModelInModelList(config.modelId)) {
      throw new Error(`Unknown WebLLM model: ${config.modelId}`);
    }
    this.#module = module;
    this.#engine = await module.CreateMLCEngine(config.modelId, {
      initProgressCallback: (report) => this.#initProgress?.(report.progress ?? 0, report.text ?? ''),
    });
    return 'webllm-session';
  }

  async *generate(
    _session: SessionId,
    request: GenerateRequest,
    signal?: AbortSignal,
  ): AsyncIterable<TokenEvent, void, undefined> {
    if (!this.#engine) throw new Error('WebLLM engine not initialized');
    if (signal) signal.addEventListener('abort', () => this.#engine?.interruptGenerate(), { once: true });
    const stream = await this.#engine.chat.completions.create({
      messages: request.messages,
      stream: true,
      max_tokens: request.maxTokens,
      stop: request.stop,
      stream_options: { include_usage: false },
    });
    for await (const chunk of stream) {
      if (signal?.aborted) return;
      const text = chunk.choices?.[0]?.delta?.content ?? '';
      if (text) yield { text };
    }
  }

  async batchScore(): Promise<Float32Array> {
    return new Float32Array(0);
  }

  async kvStats(): Promise<KvCacheStats> {
    return { tokens: 0, bytes: 0, bytesPerToken: 0, compressed: false };
  }

  async reset(): Promise<void> {
    await this.#engine?.resetChat();
  }

  async close(): Promise<void> {
    await this.#engine?.unload().catch(() => undefined);
    this.#engine = null;
  }
}
