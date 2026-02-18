import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global test setup
// Add any global mocks or configurations here

// Mock lottie-react to avoid canvas issues in tests
vi.mock('lottie-react', () => ({
  default: () => null,
}));

// Mock react-pdf to avoid DOMMatrix issues in tests
vi.mock('react-pdf', () => ({
  Document: () => null,
  Page: () => null,
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: '',
    },
    version: '0.0.0',
  },
}));

// Mock React components that have heavy dependencies
vi.mock('@/lib/compass-planes/sheet-editor', () => ({
  SheetEditor: () => null,
}));
