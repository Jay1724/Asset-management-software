import { DepreciationMethod } from "./enums";

export interface StraightLineInput {
  method: DepreciationMethod.STRAIGHT_LINE;
  purchaseValue: number;
  salvageValue: number;
  usefulLifeYears: number;
  yearsElapsed: number;
}

export interface DecliningBalanceInput {
  method: DepreciationMethod.DECLINING_BALANCE;
  currentBookValue: number;
  usefulLifeYears: number;
  salvageValue: number;
  rate?: number;
}

export interface UnitsOfProductionInput {
  method: DepreciationMethod.UNITS_OF_PRODUCTION;
  purchaseValue: number;
  salvageValue: number;
  totalExpectedUnits: number;
  unitsUsedToDate: number;
}

export type DepreciationInput =
  | StraightLineInput
  | DecliningBalanceInput
  | UnitsOfProductionInput;

export interface DepreciationResult {
  currentValue: number;
  periodDepreciation: number;
}
