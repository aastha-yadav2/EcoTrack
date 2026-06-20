import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AIAssistant } from '../components/AIAssistant';

// Clear mock fetch before each test
describe('<AIAssistant /> Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should render welcoming message with dynamic carbon rating score', () => {
    render(
      <AIAssistant
        isOpen={true}
        onClose={vi.fn()}
        activities={[]}
        score={78}
      />
    );

    expect(screen.getByText(/EcoTrack AI Sustainability Advisor/i)).toBeInTheDocument();
    expect(screen.getByText(/78\/100/i)).toBeInTheDocument();
    expect(screen.getByText('How is my sustainability score computed?')).toBeInTheDocument();
  });

  it('should send a message when clicking a quick suggestion and render response from server', async () => {
    const mockJsonPromise = Promise.resolve({
      reply: 'Shifting commutable miles to transit can save over 45 kg of CO2 per week.'
    });
    const mockFetchPromise = Promise.resolve({
      ok: true,
      json: () => mockJsonPromise
    });
    const fetchMock = vi.fn().mockImplementation(() => mockFetchPromise);
    global.fetch = fetchMock;

    render(
      <AIAssistant
        isOpen={true}
        onClose={vi.fn()}
        activities={[]}
        score={80}
      />
    );

    // Click quick suggestion button
    const suggestionBtn = screen.getByRole('button', { name: 'How is my sustainability score computed?' });
    fireEvent.click(suggestionBtn);

    // Verify it sent a prompt to /api/chat
    expect(fetchMock).toHaveBeenCalledWith('/api/chat', expect.any(Object));

    // Wait until response appears in the chat bubbler list
    await waitFor(() => {
      expect(screen.getByText('Shifting commutable miles to transit can save over 45 kg of CO2 per week.')).toBeInTheDocument();
    });
  });

  it('should display error indicator message when server endpoint request fails', async () => {
    global.fetch = vi.fn().mockImplementation(() => Promise.reject(new Error('Network error')));

    render(
      <AIAssistant
        isOpen={true}
        onClose={vi.fn()}
        activities={[]}
        score={80}
      />
    );

    // Enter manual text and click Send button
    const inputField = screen.getByPlaceholderText(/Ask about your emissions/i);
    expect(inputField).toBeInTheDocument();

    fireEvent.change(inputField, { target: { value: 'Is solar installation useful?' } });
    const sendButton = screen.getByLabelText('Send query');
    
    fireEvent.click(sendButton);

    // Verify error indicator bubble appears containing fallback suggestion
    await waitFor(() => {
      expect(screen.getByText(/I had a temporary issue fetching data through the eco-grid/i)).toBeInTheDocument();
    });
  });
});
