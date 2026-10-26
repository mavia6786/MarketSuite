import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/services/api';

export type RemoteState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: ApiError };

type Settled<T> = {
  loader: unknown;
  attempt: number;
  result: { status: 'ok'; data: T } | { status: 'error'; error: ApiError };
};

/**
 * Runs `loader` and tracks loading / ok / error. `loader` MUST be stable (wrap it in useCallback
 * with the values it depends on); a new loader or a retry starts a new request and cancels the old one.
 */
export function useRemote<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loader(controller.signal)
      .then((data) => setSettled({ loader, attempt, result: { status: 'ok', data } }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const error = err instanceof ApiError ? err : new ApiError(0, 'UNKNOWN_ERROR', 'Something went wrong.');
        setSettled({ loader, attempt, result: { status: 'error', error } });
      });
    return () => controller.abort();
  }, [loader, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const state: RemoteState<T> =
    settled && settled.loader === loader && settled.attempt === attempt ? settled.result : { status: 'loading' };
  return { state, retry };
}
