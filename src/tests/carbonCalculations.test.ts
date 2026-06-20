import { describe, it, expect } from 'vitest';
import { CARBON_FACTORS } from '../data';

describe('Carbon Emission Factors Unit Tests', () => {
  it('should have exact transport and commute emission coefficients', () => {
    expect(CARBON_FACTORS.transport.gas_car).toBe(0.21);
    expect(CARBON_FACTORS.transport.hybrid_car).toBe(0.11);
    expect(CARBON_FACTORS.transport.ev).toBe(0.04);
    expect(CARBON_FACTORS.transport.transit).toBe(0.05);
    expect(CARBON_FACTORS.transport.bike_walk).toBe(0);
  });

  it('should have exact household electricity factors', () => {
    expect(CARBON_FACTORS.electricity.grid_standard).toBe(0.39);
    expect(CARBON_FACTORS.electricity.grid_smart).toBe(0.22);
    expect(CARBON_FACTORS.electricity.solar_renew).toBe(0.02);
  });

  it('should have exact food diet coefficients', () => {
    expect(CARBON_FACTORS.food.beef_lamb).toBe(7.4);
    expect(CARBON_FACTORS.food.poultry_fish).toBe(2.3);
    expect(CARBON_FACTORS.food.vegetarian).toBe(0.7);
    expect(CARBON_FACTORS.food.vegan).toBe(0.4);
  });

  it('should have exact consumer apparel and shopping footprint coefficients', () => {
    expect(CARBON_FACTORS.shopping.electronics).toBe(18.0);
    expect(CARBON_FACTORS.shopping.clothing).toBe(8.5);
    expect(CARBON_FACTORS.shopping.household).toBe(3.2);
    expect(CARBON_FACTORS.shopping.groceries).toBe(1.1);
  });

  it('should correctly calculate simulated daily emissions based on factors', () => {
    const dailyCommuteDistance = 50; // km
    const commuteType = 'hybrid_car';
    const electricityUsageMonth = 300; // kWh
    const mealsBeefCount = 2;

    const transportEmissions = dailyCommuteDistance * CARBON_FACTORS.transport[commuteType];
    const electricityDailyEmissions = (electricityUsageMonth * CARBON_FACTORS.electricity.grid_standard) / 30.4;
    const foodEmissions = mealsBeefCount * CARBON_FACTORS.food.beef_lamb;

    expect(transportEmissions).toBe(5.5);
    expect(parseFloat(electricityDailyEmissions.toFixed(2))).toBe(3.85);
    expect(foodEmissions).toBe(14.8);
  });
});
