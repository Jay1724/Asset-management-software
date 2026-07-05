import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from "class-validator";
import { AssetStatus, DepreciationMethod, UnitOfMeasure } from "@prisma/client";

export class CreateAssetDto {
  @IsUUID()
  siteId!: string;

  @IsUUID()
  categoryId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  serialNo!: string;

  @Type(() => Date)
  @IsDate()
  purchaseDate!: Date;

  @IsNumber()
  @IsPositive()
  purchaseValue!: number;

  @IsEnum(DepreciationMethod)
  depreciationMethod!: DepreciationMethod;

  @IsOptional()
  @IsEnum(UnitOfMeasure)
  unitOfMeasure?: UnitOfMeasure;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  // Required for STRAIGHT_LINE and DECLINING_BALANCE.
  @IsOptional()
  @IsNumber()
  @IsPositive()
  usefulLifeYears?: number;

  // Optional override for DECLINING_BALANCE; defaults to 2/usefulLifeYears.
  @IsOptional()
  @IsNumber()
  @IsPositive()
  rate?: number;

  // Required for UNITS_OF_PRODUCTION.
  @IsOptional()
  @IsNumber()
  @IsPositive()
  totalExpectedUnits?: number;
}
