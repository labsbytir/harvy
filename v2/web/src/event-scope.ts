export interface EventRequestToken {
  scopeRevision: number;
  requestRevision: number;
}

export class EventRequestGuard {
  private scopeKey = "";
  private scopeRevision = 0;
  private requestRevision = 0;

  setScope(scopeKey: string): number {
    if (scopeKey !== this.scopeKey) {
      this.scopeKey = scopeKey;
      this.scopeRevision += 1;
      this.requestRevision += 1;
    }
    return this.scopeRevision;
  }

  invalidate(): void {
    this.scopeRevision += 1;
    this.requestRevision += 1;
  }

  begin(scopeKey?: string): EventRequestToken {
    if (scopeKey !== undefined) this.setScope(scopeKey);
    this.requestRevision += 1;
    return this.capture();
  }

  capture(): EventRequestToken {
    return { scopeRevision: this.scopeRevision, requestRevision: this.requestRevision };
  }

  isCurrent(token: EventRequestToken): boolean {
    return token.scopeRevision === this.scopeRevision && token.requestRevision === this.requestRevision;
  }
}

export async function runScopedLoad<T>(
  guard: EventRequestGuard,
  scopeKey: string,
  load: (isCurrent: () => boolean) => Promise<T>,
  onSuccess: (value: T, token: EventRequestToken) => void,
  onError: (error: unknown) => void,
  onFinally: (isCurrent: boolean) => void,
): Promise<void> {
  const token = guard.begin(scopeKey);
  const isCurrent = () => guard.isCurrent(token);
  try {
    const value = await load(isCurrent);
    if (isCurrent()) onSuccess(value, token);
  } catch (error) {
    if (isCurrent()) onError(error);
  } finally {
    onFinally(isCurrent());
  }
}

export function appendUniqueEvents<T extends { id: string }>(current: readonly T[], incoming: readonly T[]): T[] {
  const seen = new Set(current.map((event) => event.id));
  return [...current, ...incoming.filter((event) => !seen.has(event.id) && !!seen.add(event.id))];
}
