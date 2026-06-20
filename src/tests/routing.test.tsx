import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';

describe('App Layout Navigation and Routing Tests', () => {
  it('should render the application header and navigate through tab menus', async () => {
    render(<App />);

    // Wait for the initialization loader to clear
    await waitFor(() => {
      expect(screen.queryByText(/Initializing planetary metrics.../i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify application brand or title exists
    expect(screen.getAllByRole('heading', { name: /Eco *Track/i })[0]).toBeInTheDocument();
    
    // Check main navigation links exist
    const calculatorTab = screen.getByRole('button', { name: 'Calculator' });
    const ecoScanTab = screen.getByRole('button', { name: 'EcoScan AI' });
    const goalsTab = screen.getByRole('button', { name: 'Goals' });

    expect(calculatorTab).toBeInTheDocument();
    expect(ecoScanTab).toBeInTheDocument();
    expect(goalsTab).toBeInTheDocument();

    // Initially we should see the home description
    expect(screen.getByText(/Empowering individuals, families/i)).toBeInTheDocument();

    // Click on the Calculator tab
    fireEvent.click(calculatorTab);

    // Verify the Intelligent Calculator page displays (with its unique title)
    expect(screen.getByText('Atmospheric Carbon Calculator')).toBeInTheDocument();

    // Click on the Goals tab
    fireEvent.click(goalsTab);

    // Verify the Goals page or section displays
    expect(screen.getByText('Sovereign Goal Registry')).toBeInTheDocument();
  });

  it('should toggle theme display mode between light and dark', async () => {
    render(<App />);

    // Wait for loading screen to clear
    await waitFor(() => {
      expect(screen.queryByText(/Initializing planetary metrics.../i)).not.toBeInTheDocument();
    });

    // Find the sun/moon icon button
    const themeBtn = screen.getByLabelText('Toggle theme display mode');
    expect(themeBtn).toBeInTheDocument();

    // Click it and watch for state alterations (e.g. updating localstorage)
    fireEvent.click(themeBtn);
    expect(localStorage.getItem('ecotrack-theme')).toBe('light');

    fireEvent.click(themeBtn);
    expect(localStorage.getItem('ecotrack-theme')).toBe('dark');
  });
});
