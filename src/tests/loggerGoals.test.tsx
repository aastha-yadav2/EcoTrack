import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ActivityLogger } from '../components/ActivityLogger';
import { GoalManager } from '../components/GoalManager';
import { Activity, Goal } from '../types';

describe('Logger and Goals Manager Components', () => {
  describe('<ActivityLogger />', () => {
    it('should submit correct transport values on form submission', () => {
      const handleAddActivity = vi.fn();
      render(<ActivityLogger onAddActivity={handleAddActivity} isDark={true} />);

      // Fill in transport inputs
      const distanceInput = screen.getByLabelText(/Travel Distance/i);
      expect(distanceInput).toBeInTheDocument();
      fireEvent.change(distanceInput, { target: { value: '45' } });

      const selectVehicle = screen.getByLabelText(/Transport Mode/i);
      fireEvent.change(selectVehicle, { target: { value: 'ev' } });

      // Click log button
      const submitButton = screen.getByRole('button', { name: /Log This Activity/i });
      fireEvent.click(submitButton);

      expect(handleAddActivity).toHaveBeenCalledWith({
        category: 'transport',
        label: '45km Commute via Electric Vehicle (EV)',
        value: 45,
        carbonAmount: 45 * 0.04 // EV factor is 0.04
      });
    });

    it('should perform validation allowing only inputs greater than zero', () => {
      const handleAddActivity = vi.fn();
      render(<ActivityLogger onAddActivity={handleAddActivity} isDark={true} />);

      const distanceInputs = screen.getAllByLabelText(/Travel Distance/i);
      distanceInputs.forEach(input => {
        fireEvent.change(input, { target: { value: '' } });
      });

      const submitButton = screen.getByRole('button', { name: /Log This Activity/i });
      fireEvent.click(submitButton);

      expect(handleAddActivity).not.toHaveBeenCalled();
    });

    it('should switch categories to Food and submit correct meal values', () => {
      const handleAddActivity = vi.fn();
      render(<ActivityLogger onAddActivity={handleAddActivity} isDark={true} />);

      // Switch to Food category tab
      const foodTabButton = screen.getByRole('button', { name: 'Log Food Intake' });
      fireEvent.click(foodTabButton);

      const mealInput = screen.getByLabelText(/Portion Servings/i);
      fireEvent.change(mealInput, { target: { value: '3' } });

      const mealTypeSelect = screen.getByLabelText(/Dietary Composition/i);
      fireEvent.change(mealTypeSelect, { target: { value: 'vegan' } });

      const submitButton = screen.getByRole('button', { name: /Log This Activity/i });
      fireEvent.click(submitButton);

      expect(handleAddActivity).toHaveBeenCalledWith({
        category: 'food',
        label: '3x 100% Plant-Based Vegan Meal',
        value: 3,
        carbonAmount: 1.2
      });
    });
  });

  describe('<GoalManager />', () => {
    const mockGoals: Goal[] = [
      {
        id: 'goal-xxx',
        title: 'Save some miles',
        category: 'transport',
        targetKg: 100,
        currentKg: 40,
        deadline: '2026-06-30',
        isCompleted: false
      }
    ];

    const mockActivities: Activity[] = [
      {
        id: 'act-1',
        category: 'transport',
        label: 'Gas commute',
        value: 50,
        carbonAmount: 20,
        timestamp: '2026-06-20T00:00:00Z'
      }
    ];

    it('should display goal progress and titles accurately', () => {
      render(
        <GoalManager
          goals={mockGoals}
          activities={mockActivities}
          onSaveGoal={vi.fn().mockResolvedValue(undefined)}
          onDeleteGoal={vi.fn().mockResolvedValue(undefined)}
          onAddNotification={vi.fn()}
          isDark={true}
        />
      );

      expect(screen.getByText('Save some miles')).toBeInTheDocument();
      // Spent 20kg out of 100kg limit = 80% budget remaining active
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('should render forms and handle deleting a goal', async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      render(
        <GoalManager
          goals={mockGoals}
          activities={mockActivities}
          onSaveGoal={vi.fn().mockResolvedValue(undefined)}
          onDeleteGoal={mockDelete}
          onAddNotification={vi.fn()}
          isDark={true}
        />
      );

      // Locate delete button
      const deleteButton = screen.getByTitle('Delete record');
      expect(deleteButton).toBeInTheDocument();

      fireEvent.click(deleteButton);
      expect(mockDelete).toHaveBeenCalledWith('goal-xxx');
    });
  });
});
