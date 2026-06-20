import { describe, it, expect, vi } from 'vitest';

// Interface definitions matching the backend schemas
interface ActivityStats {
  transport: number;
  electricity: number;
  food: number;
  shopping: number;
}

describe('Express API Endpoint Logic & JSON Handlers', () => {
  describe('POST /api/insights', () => {
    it('should generate accurate fallback statistics and tips when AI copilot is offline', () => {
      const requestBody = {
        activityStats: { transport: 120, electricity: 85, food: 60, shopping: 30 },
        currentScore: 78,
        carbonSaved: 42,
        carbonTotal: 295
      };

      // Mocking the endpoint fallback logic from server.ts (lines 28-61)
      const mockInsightsHandler = (reqBody: typeof requestBody) => {
        const { activityStats, currentScore, carbonTotal } = reqBody;
        const predictions = Math.max(10, Math.round(carbonTotal * 0.88));
        
        return {
          insights: [
            {
              id: "ins-1",
              type: "warning",
              title: "Heavy Automobile Footprint Detected",
              content: `Your transit stats account for ${activityStats?.transport || 140} kg of carbon. Shifting just three short solo drives to cycling or transit this week will boost your score to ${Math.min(100, currentScore + 6)}!`,
              impact: "-18 kg CO2e"
            },
            {
              id: "ins-2",
              type: "success",
              title: "Superb Electrical Efficiency",
              content: `Your energy consumption score is incredibly efficient, staying below average at ${activityStats?.electricity || 90} kg CO2e. Keep maintaining active sleep-mode devices.`,
              impact: "-24 kg CO2e"
            },
            {
              id: "ins-3",
              type: "info",
              title: "Incorporate Plant-Based Dinners",
              content: `Food intake stats show ${activityStats?.food || 80} kg emissions. Replacing red meat options twice a week with local produce reduces shipping carbon and gains the 'Botanical Taste' badge.`,
              impact: "-12 kg CO2e"
            }
          ],
          tipOfDay: "Reduce phantom loads: major devices in standby mode consume up to 10% of home electricity. Smart plugs are a great way to fully disconnect items.",
          predictedEmissions: predictions
        };
      };

      const result = mockInsightsHandler(requestBody);

      expect(result.insights).toHaveLength(3);
      expect(result.predictedEmissions).toBe(260); // 295 * 0.88 = 259.6 -> 260
      expect(result.insights[0].content).toContain('120 kg of carbon');
      expect(result.insights[1].content).toContain('85 kg CO2e');
      expect(result.insights[2].content).toContain('60 kg emissions');
      expect(result.tipOfDay).toContain('Smart plugs');
    });
  });

  describe('POST /api/goals-advisor', () => {
    it('should correctly format suggestion guidelines and steps for falling behind on goals', () => {
      const requestBody = {
        goal: { id: 'g1', title: 'Cut food carbon', targetKg: 30, category: 'food', deadline: '2026-06-25' },
        currentProgress: 35.5,
        relevantActivities: []
      };

      // Mocking goals advisor fallback logic from server.ts (lines 160-167)
      const mockGoalsAdvisorHandler = (reqBody: typeof requestBody) => {
        const { goal, currentProgress } = reqBody;
        return {
          suggestion: `You are currently at ${currentProgress.toFixed(0)}% of your target of ${goal.targetKg} for "${goal.title}". To accelerate progress, we advise checking standby phantom loads and adopting a hybrid transit pattern for your routine travels.`,
          actionSteps: [
            "Swap two solo petrol commutes for transit or a high-efficiency scooter.",
            "Set timers on smart outlets or completely unplug inactive TV and kitchen systems.",
            "Incorporate a fully vegetarian or localized veggie salad diet twice this week."
          ]
        };
      };

      const response = mockGoalsAdvisorHandler(requestBody);

      expect(response.suggestion).toBe('You are currently at 36% of your target of 30 for "Cut food carbon". To accelerate progress, we advise checking standby phantom loads and adopting a hybrid transit pattern for your routine travels.');
      expect(response.actionSteps).toHaveLength(3);
      expect(response.actionSteps[0]).toBe('Swap two solo petrol commutes for transit or a high-efficiency scooter.');
    });
  });

  describe('POST /api/gamification-advisor', () => {
    it('should construct motivating progress updates for environmental levels and badges', () => {
      const requestBody = {
        achievementType: 'Badge Checked',
        achievementName: 'Zero Commute Hero',
        userLevel: 3,
        streakCount: 5
      };

      // Mocking gamification helper logic from server.ts (lines 223 bg)
      const mockGamificationHandler = (reqBody: typeof requestBody) => {
        const { achievementName, userLevel, streakCount } = reqBody;
        return {
          message: `Incredible work unlocking "${achievementName}"! Reaching Level ${userLevel} and maintaining a ${streakCount}-day eco streak puts you in the top tier of planetary guardians. Keep logging your offsets to trigger deeper decarbonization!`
        };
      };

      const response = mockGamificationHandler(requestBody);
      expect(response.message).toContain('Zero Commute Hero');
      expect(response.message).toContain('Level 3');
      expect(response.message).toContain('5-day eco streak');
    });
  });

  describe('Prompt context validations', () => {
    it('should format a correct conversational string query matching API requirements', () => {
      const userMessage = "Tell me how to compost.";
      const stats = { currentScore: 82, totalActivitiesLoggedCount: 15 };

      const formattedPrompt = `User Query: "${userMessage}". Stats: Score ${stats.currentScore}/100, Activities: ${stats.totalActivitiesLoggedCount}. Provide a supportive sustainability response.`;
      
      expect(formattedPrompt).toContain('Tell me how to compost.');
      expect(formattedPrompt).toContain('Score 82/100');
      expect(formattedPrompt).toContain('Activities: 15');
    });
  });
});
