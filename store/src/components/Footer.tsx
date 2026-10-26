import { useEffect, useState } from 'react';
import { Container } from '@/components/Container';
import { getHealth } from '@/services/publicApi';
import { siteConfig } from '@/utils/site';

type Status = 'checking' | 'online' | 'offline';

/** Real liveness check against the shared backend (`GET /api/health`). */
function useBackendStatus(): Status {
  const [status, setStatus] = useState<Status>('checking');
  useEffect(() => {
    const controller = new AbortController();
    getHealth(controller.signal)
      .then((r) => setStatus(r.status === 'ok' ? 'online' : 'offline'))
      .catch(() => {
        if (!controller.signal.aborted) setStatus('offline');
      });
    return () => controller.abort();
  }, []);
  return status;
}

const label: Record<Status, string> = {
  checking: 'Checking service…',
  online: 'Service online',
  offline: 'Service unreachable',
};

export function Footer() {
  const status = useBackendStatus();
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <Container className="flex flex-col gap-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          {siteConfig.portalUrl ? (
            <>
              Own a shop?{' '}
              <a className="font-medium text-brand underline" href={siteConfig.portalUrl}>
                Manage it in the MarketSuite portal
              </a>
              .
            </>
          ) : (
            'Shop owners manage their shops in the MarketSuite portal.'
          )}
        </p>
        <p role="status" className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={status === 'online' ? 'size-2 rounded-full bg-success' : status === 'offline' ? 'size-2 rounded-full bg-danger' : 'size-2 rounded-full bg-line'}
          />
          {label[status]}
        </p>
      </Container>
    </footer>
  );
}
