/**
 * TypeScript declarations for release-state.mjs.
 *
 * This is the exact, hand-authored declaration companion to the production module.
 * All public symbols are declared with strict explicit types.
 */

/**
 * Release state lock file structure
 */
export interface ReleaseState {
  version: string;
  sourceHead: string;
  startedAt: string;
  completedStages: string[];
}

/**
 * Interrupt receipt structure
 */
export interface InterruptReceipt {
  target: string;
  consumed: true;
  writtenAt: string;
}

/**
 * Interrupt receipt filename
 */
export const INTERRUPT_RECEIPT_FILENAME: 'standroidsmissal-release-interrupt-receipt.json';

/**
 * Exit code when controlled interrupt occurs
 */
export const INTERRUPT_EXIT_CODE: 70;

/**
 * Exit code when receipt validation fails
 */
export const RECEIPT_MISMATCH_EXIT_CODE: 71;

/**
 * Dependency injection interface for hermetic testing
 */
export interface ReleaseDeps {
  /**
   * Unified command runner for stamp and stages.
   * Injected in tests to avoid real builds.
   * Returns exit code or void (0 implied).
   */
  runCommand?: (name: string) => Promise<number | void>;
  /**
   * Environment variables override.
   * In stub mode (RELEASE_STATE_RUNNER=stub + RELEASE_STATE_FIXTURE set),
   * RELEASE_STATE_INTERRUPT_AT=<canonical-stage> enables controlled interrupt
   * at the specified stage (default unset; ignored in production).
   */
  env?: Record<string, string | undefined>;
  /**
   * Current working directory override
   */
  cwd?: string;
  /**
   * Hermetic fixture directory for lock/outbox/log root
   */
  fixtureDir?: string;
  /**
   * Process object override
   */
  process?: NodeJS.Process;
  /**
   * File system module override
   */
  fs?: typeof import('node:fs');
  /**
   * Path module override
   */
  path?: typeof import('node:path');
}

/**
 * Expand a tilde-prefixed path to the home directory.
 * @param value - The path to expand (may start with ~ or ~/)
 * @param home - The home directory to use (defaults to os.homedir())
 * @returns The expanded absolute path
 * @throws Error if the path starts with ~user (user-specific expansion is not supported)
 */
export function expandHomePath(value: string, home?: string): string;

/**
 * Canonical stage order
 */
export const STAGE_ORDER: readonly string[];

/**
 * Get interrupt receipt path for fixture directory.
 * @param fixtureDir - The fixture directory path
 * @returns The interrupt receipt file path
 */
export function getReceiptPath(fixtureDir: string): string;

/**
 * Read and validate interrupt receipt from fixture directory.
 * @param fixtureDir - The fixture directory path
 * @returns The parsed receipt, or null if file doesn't exist
 * @throws Error if the file exists but is invalid JSON or structurally malformed
 */
export function readInterruptReceipt(fixtureDir: string): InterruptReceipt | null;

/**
 * Atomically write interrupt receipt for a target stage.
 * @param target - The stage name being interrupted
 * @param fixtureDir - The fixture directory path
 */
export function writeInterruptReceipt(target: string, fixtureDir: string): void;

/**
 * Print usage information
 */
export function printUsage(): void;

/**
 * Run a single release stage and mark it complete.
 * @param stage - The stage name to run
 * @param deps - Optional dependency overrides
 * @param root - Root directory
 * @param lockPath - Lock file path
 * @returns Exit code (0 for success)
 * @throws Error if stage is unknown or lock file is invalid
 */
export function runReleaseStage(stage: string, deps?: ReleaseDeps, root?: string, lockPath?: string): Promise<number>;

/**
 * Main release orchestration entry point.
 * @param argv - Command line arguments (typically process.argv)
 * @param deps - Optional dependency overrides for hermetic testing
 * @returns Exit code (0 for success, non-zero for failure)
 */
export function main(argv: readonly string[], deps?: ReleaseDeps): Promise<number>;
