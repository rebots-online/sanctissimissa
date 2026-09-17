// Shared inference contract for every Liturgibot backend (reusable-chatbot).
// TurboQuant everywhere (operator decision 2026-09-07): the same interface is
// implemented by the WebGPU engine, the WASM-SIMD fallback, the native Tauri
// adapter and the Android NDK adapter. Handles stay opaque — no GPUBuffer,
// native pointer or raw K/V tensor ever crosses this interface; KV cache
// state is owned by the engine (worker/GPU or native session), never shipped
// through postMessage or per-token IPC calls.

export type SessionId = string;

export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMsg {
  role: ChatRole;
  content: string;
}

export interface TokenEvent {
  /** Incremental decoded text piece for this step. */
  text: string;
  tokenId?: number;
}

export interface GenerateRequest {
  messages: ChatMsg[];
  maxTokens?: number;
  stop?: string[];
}

export interface BatchScoreItem {
  context: ChatMsg[];
  continuation: string;
}
export interface BatchScoreRequest {
  items: BatchScoreItem[];
}

export interface KvCacheStats {
  tokens: number;
  bytes: number;
  bytesPerToken: number;
  /** True when the cache is TurboQuant-compressed (turbo2/3/4). */
  compressed: boolean;
}

export type RuntimeKind = 'web' | 'tauri' | 'android' | 'hosted';
export type BackendKind = 'webgpu' | 'wasm-simd' | 'turboquant-native' | 'hosted';
export type TurboQuantKvFormat = 'turbo2' | 'turbo3' | 'turbo4' | 'q8_0' | 'f16';

export interface EngineCapabilities {
  runtime: RuntimeKind;
  backend: BackendKind;
  /** TurboQuant KV formats this engine can honor. Empty = KV compression unavailable. */
  kvFormats: TurboQuantKvFormat[];
  /** Weight quant formats this engine can load (e.g. "Q4_K_M", "TQ3_1S"). */
  weightFormats: string[];
  maxContextTokens?: number;
  /** WebGPU adapter limits (maxBufferSize, maxStorageBufferBindingSize, workgroup sizes, ...). */
  adapterLimits?: Record<string, number>;
  notes?: string[];
}

export interface EngineConfig {
  /** Registry model id (e.g. "AtomicChat/gemma-4-E2B-it-GGUF") — selected, never hardcoded. */
  modelId: string;
  artifactUrl: string;
  weightQuant?: string;
  kvFormat?: TurboQuantKvFormat;
  contextTokens?: number;
  threads?: number;
}

export interface IInferenceEngine {
  /** Capability truth from the executable engine, not from catalog claims. */
  probe(): Promise<EngineCapabilities>;
  init(config: EngineConfig): Promise<SessionId>;
  generate(session: SessionId, request: GenerateRequest, signal?: AbortSignal): AsyncIterable<TokenEvent>;
  batchScore(session: SessionId, request: BatchScoreRequest): Promise<Float32Array>;
  kvStats(session: SessionId): Promise<KvCacheStats>;
  reset(session: SessionId): Promise<void>;
  close(session: SessionId): Promise<void>;
}
