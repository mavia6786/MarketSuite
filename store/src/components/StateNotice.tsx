import type { ReactNode } from 'react';
import type { ApiError } from '@/services/api';
import { Button } from '@/components/Button';

/** Empty / error panel: says what happened and what to do next. */
export function StateNotice({
  title,
  children,
  action,
  tone = 'neutral',
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center"
    >
      <h2 className={tone === 'error' ? 'text-xl font-semibold text-danger' : 'text-xl font-semibold'}>{title}</h2>
      {children && <p className="mx-auto mt-2 max-w-md leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/** Error panel for a failed API call. Distinguishes "backend not ready" from network/server errors. */
export function ApiErrorNotice({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const retry = <Button variant="secondary" onClick={onRetry}>Try again</Button>;
  if (error.status === 404 && error.code === 'NOT_FOUND') {
    return (
      <StateNotice title="The store service isn’t connected yet" tone="error" action={retry}>
        The backend this store talks to doesn’t offer the public shop endpoints. Update the shared backend (management/server) and try again.
      </StateNotice>
    );
  }
  if (error.status === 0) {
    return (
      <StateNotice title="Can’t reach the server" tone="error" action={retry}>
        Check your internet connection, or that the backend is running, then try again.
      </StateNotice>
    );
  }
  return (
    <StateNotice title="Something went wrong" tone="error" action={retry}>
      {error.message}
    </StateNotice>
  );
}

export function CardSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="st-skeleton h-44 rounded-xl" />
      ))}
    </div>
  );
}
