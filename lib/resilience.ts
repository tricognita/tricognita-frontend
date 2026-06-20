/**
 * Production-grade resilience utilities for Tricognita.
 * Implements Request Deduplication and Circuit Breaker patterns.
 */

// ─── Request Deduplication ───────────────────────────────────────────────────

type InFlightRequest = Promise<any>;
const inFlight = new Map<string, InFlightRequest>();

/**
 * deduplicate ensures that concurrent identical requests share the same promise.
 * Key is generated from endpoint and stringified params.
 */
export async function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

export enum CBState {
  CLOSED,    // Normal operation
  OPEN,      // Blocked
  HALF_OPEN, // Testing recovery
}

interface CBOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
}

class CircuitBreaker {
  private state: CBState = CBState.CLOSED;
  private failures = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private options: CBOptions;

  constructor(options: CBOptions = { failureThreshold: 5, resetTimeoutMs: 30000 }) {
    this.options = options;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.updateState();

    if (this.state === CBState.OPEN) {
      throw new Error("Circuit breaker is OPEN");
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private updateState() {
    if (this.state === CBState.OPEN && Date.now() > this.nextAttemptTime) {
      this.state = CBState.HALF_OPEN;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = CBState.CLOSED;
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold) {
      this.state = CBState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeoutMs;
    }
  }

  getState(): CBState {
    this.updateState();
    return this.state;
  }
}

// Global registry for circuit breakers (keyed by service/endpoint group)
const breakers = new Map<string, CircuitBreaker>();

export function getBreaker(key: string, options?: CBOptions): CircuitBreaker {
  if (!breakers.has(key)) {
    breakers.set(key, new CircuitBreaker(options));
  }
  return breakers.get(key)!;
}

/**
 * resilientFetch wraps fetch with deduplication and circuit breaking.
 */
export async function resilientFetch<T>(
  url: string,
  options: RequestInit = {},
  breakerKey: string = "global"
): Promise<T> {
  const dedupKey = `${url}:${JSON.stringify(options.body || "")}:${options.method}`;
  const breaker = getBreaker(breakerKey);

  return deduplicate(dedupKey, () => 
    breaker.execute(async () => {
      const res = await fetch(url, options);
      if (!res.ok) throw res; // throw the response so breaker can detect status
      return res.json();
    })
  );
}
