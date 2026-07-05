import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateSiteDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
