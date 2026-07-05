import { DepreciationMethod } from "@mining/shared";
import { DepreciationCalculator } from "../depreciation-calculator";

describe("DepreciationCalculator", () => {
  const calculator = new DepreciationCalculator();

  describe("straight-line", () => {
    it("depreciates evenly over the useful life", () => {
      // $100,000 purchase, $10,000 salvage, 9-year life -> $10,000/year
      const result = calculator.calculate({
        method: DepreciationMethod.STRAIGHT_LINE,
        purchaseValue: 100_000,
        salvageValue: 10_000,
        usefulLifeYears: 9,
        yearsElapsed: 3,
      });

      expect(result.periodDepreciation).toBeCloseTo(10_000);
      expect(result.currentValue).toBeCloseTo(70_000);
    });

    it("never depreciates below salvage value", () => {
      const result = calculator.calculate({
        method: DepreciationMethod.STRAIGHT_LINE,
        purchaseValue: 100_000,
        salvageValue: 10_000,
        usefulLifeYears: 5,
        yearsElapsed: 20,
      });

      expect(result.currentValue).toBeCloseTo(10_000);
    });
  });

  describe("declining balance", () => {
    it("applies the double-declining default rate to book value", () => {
      // 10-year life -> rate = 2/10 = 0.2; book value $50,000 -> $10,000 depreciation
      const result = calculator.calculate({
        method: DepreciationMethod.DECLINING_BALANCE,
        currentBookValue: 50_000,
        usefulLifeYears: 10,
        salvageValue: 5_000,
      });

      expect(result.periodDepreciation).toBeCloseTo(10_000);
      expect(result.currentValue).toBeCloseTo(40_000);
    });

    it("honors an explicit override rate", () => {
      const result = calculator.calculate({
        method: DepreciationMethod.DECLINING_BALANCE,
        currentBookValue: 50_000,
        usefulLifeYears: 10,
        salvageValue: 5_000,
        rate: 0.1,
      });

      expect(result.periodDepreciation).toBeCloseTo(5_000);
      expect(result.currentValue).toBeCloseTo(45_000);
    });

    it("never depreciates below salvage value", () => {
      const result = calculator.calculate({
        method: DepreciationMethod.DECLINING_BALANCE,
        currentBookValue: 6_000,
        usefulLifeYears: 5,
        salvageValue: 5_000,
      });

      expect(result.currentValue).toBeCloseTo(5_000);
    });
  });

  describe("units of production", () => {
    it("depreciates proportionally to usage", () => {
      // $100,000 purchase, $0 salvage, 100,000 tonnes expected -> $1/tonne
      const result = calculator.calculate({
        method: DepreciationMethod.UNITS_OF_PRODUCTION,
        purchaseValue: 100_000,
        salvageValue: 0,
        totalExpectedUnits: 100_000,
        unitsUsedToDate: 25_000,
      });

      expect(result.periodDepreciation).toBeCloseTo(1);
      expect(result.currentValue).toBeCloseTo(75_000);
    });

    it("never depreciates below salvage value even if units exceed the estimate", () => {
      const result = calculator.calculate({
        method: DepreciationMethod.UNITS_OF_PRODUCTION,
        purchaseValue: 100_000,
        salvageValue: 10_000,
        totalExpectedUnits: 50_000,
        unitsUsedToDate: 999_999,
      });

      expect(result.currentValue).toBeCloseTo(10_000);
    });
  });
});
