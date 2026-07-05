import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { ValuationEventType } from "@prisma/client";

export class CreateValuationEventDto {
  /** DEPRECIATION is reserved for the depreciation engine and rejected here — see AssetsService.addValuationEvent. */
  @IsEnum(ValuationEventType)
  type!: ValuationEventType;

  /** Signed amount: positive for appreciation/uplift, negative for a downward manual adjustment. */
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
