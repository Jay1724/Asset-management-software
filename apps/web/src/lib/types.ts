import { AssetStatus, DepreciationMethod, UnitOfMeasure, ValuationEventType, ValuationSource } from "@mining/shared";

export interface Site {
  id: string;
  name: string;
  location: string | null;
  timezone: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  defaultDepreciationMethod: DepreciationMethod;
}

export interface DepreciationSchedule {
  id: string;
  method: DepreciationMethod;
  rate: string | null;
  usefulLifeYears: number | null;
  salvageValue: string;
  totalExpectedUnits: string | null;
  unitsUsedToDate: string;
  lastCalculatedValue: string | null;
  lastRunDate: string | null;
}

export interface Asset {
  id: string;
  name: string;
  serialNo: string;
  purchaseDate: string;
  purchaseValue: string;
  currentValue: string;
  depreciationMethod: DepreciationMethod;
  unitOfMeasure: UnitOfMeasure;
  status: AssetStatus;
  site?: Site;
  category?: AssetCategory;
  depreciationSchedule?: DepreciationSchedule | null;
}

export interface ValuationEvent {
  id: string;
  type: ValuationEventType;
  source: ValuationSource;
  amount: string;
  resultingValue: string;
  note: string | null;
  createdAt: string;
}
