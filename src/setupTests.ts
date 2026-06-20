import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Handle import.meta.env fallback inside tests
if (typeof (import.meta as any).env === 'undefined') {
  (import.meta as any).env = {
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test-auth',
    VITE_FIREBASE_PROJECT_ID: 'test-proj',
    VITE_FIREBASE_STORAGE_BUCKET: 'test-bucket',
    VITE_FIREBASE_MESSAGING_SENDER_ID: 'test-sender',
    VITE_FIREBASE_APP_ID: 'test-app-id',
    VITE_FIREBASE_DATABASE_ID: 'test-database-id',
  };
}

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock html element prototyper scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock Recharts to avoid jsdom rendering crashes
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: any) => React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    BarChart: ({ children, data }: any) => React.createElement('div', { 'data-testid': 'bar-chart', 'data-data': JSON.stringify(data || []) }, children),
    Bar: () => React.createElement('div', { 'data-testid': 'chart-bar' }),
    XAxis: () => React.createElement('div', { 'data-testid': 'chart-xaxis' }),
    YAxis: () => React.createElement('div', { 'data-testid': 'chart-yaxis' }),
    CartesianGrid: () => React.createElement('div', { 'data-testid': 'chart-grid' }),
    Tooltip: () => React.createElement('div', { 'data-testid': 'chart-tooltip' }),
    Legend: () => React.createElement('div', { 'data-testid': 'chart-legend' }),
    LineChart: ({ children, data }: any) => React.createElement('div', { 'data-testid': 'line-chart', 'data-data': JSON.stringify(data || []) }, children),
    Line: () => React.createElement('div', { 'data-testid': 'chart-line' }),
    PieChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'pie-chart' }, children),
    Pie: ({ data }: any) => React.createElement('div', { 'data-testid': 'chart-pie', 'data-data': JSON.stringify(data || []) }),
    Cell: () => React.createElement('div', { 'data-testid': 'chart-cell' }),
    AreaChart: ({ children, data }: any) => React.createElement('div', { 'data-testid': 'area-chart', 'data-data': JSON.stringify(data || []) }, children),
    Area: () => React.createElement('div', { 'data-testid': 'chart-area' }),
  };
});

// Mock firebase auth
vi.mock('firebase/auth', () => {
  return {
    getAuth: vi.fn(() => ({
      currentUser: {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Eco Tracker',
        emailVerified: true,
        isAnonymous: false,
        providerData: [{ providerId: 'google.com', email: 'test@example.com' }]
      },
    })),
    onAuthStateChanged: vi.fn((auth, callback) => {
      callback({
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Eco Tracker',
        emailVerified: true,
        isAnonymous: false,
        providerData: [{ providerId: 'google.com', email: 'test@example.com' }]
      });
      return () => {};
    }),
    signInWithPopup: vi.fn(() => Promise.resolve({
      user: {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Eco Tracker'
      }
    })),
    signOut: vi.fn(() => Promise.resolve()),
    GoogleAuthProvider: class {}
  };
});

// Mock firebase firestore
vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(() => Promise.resolve({
      exists: () => true,
      data: () => ({})
    })),
    getDocs: vi.fn(() => Promise.resolve({
      empty: false,
      docs: []
    })),
    setDoc: vi.fn(() => Promise.resolve()),
    updateDoc: vi.fn(() => Promise.resolve()),
    deleteDoc: vi.fn(() => Promise.resolve()),
    getDocFromServer: vi.fn(() => Promise.resolve({
      exists: () => true,
      data: () => ({})
    }))
  };
});
