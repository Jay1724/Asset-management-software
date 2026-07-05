import { OmitType, PartialType } from "@nestjs/mapped-types";
import { CreateAssetDto } from "./create-asset.dto";

/**
 * Value/schedule fields are intentionally excluded — those only ever
 * change through the depreciation engine or a logged ValuationEvent,
 * never a direct field edit.
 */
export class UpdateAssetDto extends PartialType(
  OmitType(CreateAssetDto, [
    "purchaseValue",
    "depreciationMethod",
    "salvageValue",
    "usefulLifeYears",
    "rate",
    "totalExpectedUnits",
  ] as const),
) {}
