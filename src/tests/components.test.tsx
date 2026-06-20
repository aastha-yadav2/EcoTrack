import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Metrics } from '../components/Metrics';
import { FooterAudit } from '../components/FooterAudit';

describe('Shared Presentation Components', () => {
  describe('<Metrics />', () => {
    it('should correctly render all four stat cards with accurate titles and numeric conversions', () => {
      render(
        <Metrics
          totalEmissions={120.4}
          carbonSaved={45.8}
          score={85}
          goalProgress={60}
          isDark={true}
        />
      );

      // Verify titles are present
      expect(screen.getByText('Monthly Carbon Footprint')).toBeInTheDocument();
      expect(screen.getByText('Carbon Offset Saved')).toBeInTheDocument();
      expect(screen.getByText('Sustainability Score')).toBeInTheDocument();
      expect(screen.getByText('Goals Progress Ratio')).toBeInTheDocument();

      // Verify accurate rounded representations via fully-formed accessible label text bounds
      expect(screen.getByLabelText('Monthly Carbon Footprint: 120 kg')).toBeInTheDocument();
      expect(screen.getByLabelText('Carbon Offset Saved: 46 kg')).toBeInTheDocument();
      expect(screen.getByLabelText('Sustainability Score: 85/100')).toBeInTheDocument();
      expect(screen.getByLabelText('Goals Progress Ratio: 60%')).toBeInTheDocument();
    });

    it('should assign correct qualitative descriptions matching standard category bounds', () => {
      const { rerender } = render(
        <Metrics
          totalEmissions={100}
          carbonSaved={50}
          score={90}
          goalProgress={10}
          isDark={true}
        />
      );
      expect(screen.getByText('Elite Conservator')).toBeInTheDocument();

      rerender(
        <Metrics
          totalEmissions={100}
          carbonSaved={50}
          score={75}
          goalProgress={10}
          isDark={true}
        />
      );
      expect(screen.getByText('Eco Warrior')).toBeInTheDocument();

      rerender(
        <Metrics
          totalEmissions={100}
          carbonSaved={50}
          score={55}
          goalProgress={10}
          isDark={true}
        />
      );
      expect(screen.getByText('Mindful Citizen')).toBeInTheDocument();

      rerender(
        <Metrics
          totalEmissions={100}
          carbonSaved={50}
          score={30}
          goalProgress={10}
          isDark={true}
        />
      );
      expect(screen.getByText('Carbon Heavy')).toBeInTheDocument();
    });
  });

  describe('<FooterAudit />', () => {
    it('should render collapsed by default and toggle open when clicking headers', () => {
      render(<FooterAudit isDark={true} />);

      // Verify that audit metric bullets are not visible by default
      expect(screen.queryByText('Strong type safety declared in /src/types.ts using interface models, standardizing custom Category offsets.')).not.toBeInTheDocument();

      // Find trigger and click
      const headerButton = screen.getByLabelText('Inspect Engineering Audit Scores');
      expect(headerButton).toBeInTheDocument();
      
      fireEvent.click(headerButton);

      // Verify expanded bullets appear
      expect(screen.getByText('Strong type safety declared in /src/types.ts using interface models, standardizing custom Category offsets.')).toBeInTheDocument();
    });
  });
});
