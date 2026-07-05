import { Module } from "@nestjs/common";
import { DepreciationCalculator } from "../depreciation/depreciation-calculator";
import { AssetsController } from "./assets.controller";
import { AssetsService } from "./assets.service";

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, DepreciationCalculator],
})
export class AssetsModule {}
