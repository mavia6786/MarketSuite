import { Container } from '@/components/Container';
import { ButtonLink } from '@/components/Button';
import { StateNotice } from '@/components/StateNotice';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function NotFoundPage() {
  usePageMeta('Page not found');
  return (
    <Container className="py-16">
      <StateNotice title="Page not found" action={<ButtonLink to="/">Go to the home page</ButtonLink>}>
        The page you opened doesn’t exist or has moved.
      </StateNotice>
    </Container>
  );
}
