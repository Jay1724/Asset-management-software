import { IsNumber, Min } from "class-validator";

/**
 * Manual stand-in for the Phase 2 telematics feed: lets a technician
 * record hours/tonnage for units-of-production assets until an OEM feed
 * (Caterpillar VisionLink, Komatsu, etc.) is wired up to do this
 * automatically.
 */
export class UpdateUsageDto {
  @IsNumber()
  @Min(0)
  unitsUsedToDate!: number;
}
