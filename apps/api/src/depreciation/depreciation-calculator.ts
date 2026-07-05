import { Injectable } from "@nestjs/common";
import {
  DepreciationInput,
  DepreciationMethod,
  DepreciationResult,
  DecliningBalanceInput,
  StraightLineInput,
  UnitsOfProductionInput,
} from "@mining/shared";

/**
 * Pure implementations of the three depreciation methods from the product
 * spec. No side effects, no persistence — callers (DepreciationService)
 * are responsible for writing the result to an immutable ValuationEvent.
 */
@Injectable()
export class DepreciationCalculator {
  calculate(input: DepreciationInput): DepreciationResult {
    switch (input.method) {
      case DepreciationMethod.STRAIGHT_LINE:
        return this.straightLine(input);
      case DepreciationMethod.DECLINING_BALANCE:
        return this.decliningBalance(input);
      case DepreciationMethod.UNITS_OF_PRODUCTION:
        return this.unitsOfProduction(input);
    }
  }

  private straightLine(input: StraightLineInput): DepreciationResult {
    const { purchaseValue, salvageValue, usefulLifeYears, yearsElapsed } = input;
    if (usefulLifeYears <= 0) {
      throw new Error("usefulLifeYears must be greater than zero");
    }

    const annualDepreciation = (purchaseValue - salvageValue) / usefulLifeYears;
    const cappedYears = Math.min(yearsElapsed, usefulLifeYears);
    const currentValue = Math.max(
      purchaseValue - annualDepreciation * cappedYears,
      salvageValue,
    );

    return { currentValue, periodDepreciation: annualDepreciation };
  }

  private decliningBalance(input: DecliningBalanceInput): DepreciationResult {
    const { currentBookValue, usefulLifeYears, salvageValue } = input;
    if (usefulLifeYears <= 0) {
      throw new Error("usefulLifeYears must be greater than zero");
    }

    const rate = input.rate ?? 2 / usefulLifeYears;
    const periodDepreciation = currentBookValue * rate;
    const currentValue = Math.max(currentBookValue - periodDepreciation, salvageValue);

    return { currentValue, periodDepreciation };
  }

  private unitsOfProduction(input: UnitsOfProductionInput): DepreciationResult {
    const { purchaseValue, salvageValue, totalExpectedUnits, unitsUsedToDate } = input;
    if (totalExpectedUnits <= 0) {
      throw new Error("totalExpectedUnits must be greater than zero");
    }

    const depreciationPerUnit = (purchaseValue - salvageValue) / totalExpectedUnits;
    const cappedUnits = Math.min(unitsUsedToDate, totalExpectedUnits);
    const currentValue = Math.max(
      purchaseValue - depreciationPerUnit * cappedUnits,
      salvageValue,
    );

    return { currentValue, periodDepreciation: depreciationPerUnit };
  }
}
