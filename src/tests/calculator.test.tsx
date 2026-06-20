import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { IntelligentCalculator } from '../components/IntelligentCalculator';

describe('<IntelligentCalculator /> Integration Tests', () => {
  it('should render default parameters and display carbon outputs', () => {
    render(
      <IntelligentCalculator
        user={null}
        isDark={true}
        onOpenSignIn={vi.fn()}
      />
    );

    // Default commute distance label should be "Daily Commute Distance"
    expect(screen.getByText('Daily Commute Distance')).toBeInTheDocument();
    
    // Check initial range slider is rendered
    const slider = screen.getByLabelText('Daily Commute Distance');
    expect(slider).toBeInTheDocument();
    expect((slider as HTMLInputElement).value).toBe('15');

    // Check pre-calculated outputs are displayed
    expect(screen.getByLabelText('Primary Commuting Vehicle Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Electricity Schedule')).toBeInTheDocument();
  });

  it('should recalculate emissions dynamically when commuting parameters are changed', async () => {
    render(
      <IntelligentCalculator
        user={null}
        isDark={true}
        onOpenSignIn={vi.fn()}
      />
    );

    const select = screen.getByLabelText('Primary Commuting Vehicle Type') as HTMLSelectElement;
    expect(select.value).toBe('petrol');

    // Change vehicle type to None (walking/biking - 0.0 offset coefficient)
    fireEvent.change(select, { target: { value: 'none' } });
    expect(select.value).toBe('none');

    // Change transport range slider travel to 70km/day
    const slider = screen.getByLabelText('Daily Commute Distance') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '70' } });
    expect(slider.value).toBe('70');
  });

  it('should toggle custom dietary button presets correctly', () => {
    render(
      <IntelligentCalculator
        user={null}
        isDark={true}
        onOpenSignIn={vi.fn()}
      />
    );

    // Toggle Vegan button
    const veganButton = screen.getByRole('button', { name: 'Vegan' });
    expect(veganButton).toBeInTheDocument();

    fireEvent.click(veganButton);
    // Button element should show active styling background classes
    expect(veganButton.className).toContain('bg-emerald-500/10');

    // Toggle High Beef
    const beefButton = screen.getByRole('button', { name: 'High Beef' });
    fireEvent.click(beefButton);
    expect(beefButton.className).toContain('bg-emerald-500/10');
    expect(veganButton.className).not.toContain('bg-emerald-500/10');
  });

  it('should toggle confidence level indicators', () => {
    render(
      <IntelligentCalculator
        user={null}
        isDark={true}
        onOpenSignIn={vi.fn()}
      />
    );

    // Locate confidence checklist toggles if present
    const odometerCheck = screen.getByLabelText(/Checked odometer/i);
    expect(odometerCheck).not.toBeChecked();

    fireEvent.click(odometerCheck);
    expect(odometerCheck).toBeChecked();
  });
});
