import { IsEnum, IsString, MinLength } from "class-validator";
import { DepreciationMethod } from "@prisma/client";

export class CreateAssetCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(DepreciationMethod)
  defaultDepreciationMethod!: DepreciationMethod;
}
