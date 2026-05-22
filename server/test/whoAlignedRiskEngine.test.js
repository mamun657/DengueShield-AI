const {
  calculateFeverWeight,
  calculateDayWeight,
  calculateWhoAlignedRisk,
  SYMPTOM_ONLY_MAX,
  LAB_CRITICAL_MIN,
} = require('../src/services/whoAlignedRiskEngine');

describe('WHO Aligned Risk Engine helpers', () => {
  test('fever scoring across thresholds', () => {
    expect(calculateFeverWeight(36.5).weight).toBe(0);
    expect(calculateFeverWeight(37.5).weight).toBe(3); // ~99.5°F
    expect(calculateFeverWeight(38.0).weight).toBe(8); // ~100.4°F
    expect(calculateFeverWeight(40.0).weight).toBe(15); // 104°F
  });

  test('illness day scoring boundaries', () => {
    expect(calculateDayWeight(1).weight).toBe(2);
    expect(calculateDayWeight(2).weight).toBe(2);
    expect(calculateDayWeight(3).weight).toBe(10);
    expect(calculateDayWeight(5).weight).toBe(10);
    expect(calculateDayWeight(6).weight).toBe(5);
    expect(calculateDayWeight('not-a-number').weight).toBe(2);
  });

  test('symptom-only mode capped by SYMPTOM_ONLY_MAX when no lab', () => {
    const input = {
      current: {
        symptoms: ['vomiting', 'abdominal pain', 'bleeding', 'restlessness'],
        temperature: 39,
        dayOfIllness: 4,
      },
      previous: null,
    };

    const res = calculateWhoAlignedRisk(input);
    expect(res.labPending).toBe(true);
    expect(res.riskScore).toBeLessThanOrEqual(SYMPTOM_ONLY_MAX);
  });

  test('clinical emergency with lab evidence meets LAB_CRITICAL_MIN', () => {
    const input = {
      current: {
        symptoms: ['bleeding'],
        temperature: 36.8,
        dayOfIllness: 4,
        labData: { shock: true },
      },
      previous: null,
    };

    const res = calculateWhoAlignedRisk(input);
    expect(res.labPending).toBe(false);
    expect(res.riskScore).toBeGreaterThanOrEqual(LAB_CRITICAL_MIN);
  });
});
