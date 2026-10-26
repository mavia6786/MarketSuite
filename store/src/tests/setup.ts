import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// jsdom does not implement these; the layout uses them for hash navigation.
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
