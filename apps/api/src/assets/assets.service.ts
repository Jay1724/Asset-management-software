import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DepreciationMethod, ValuationEventType, ValuationSource } from "@prisma/client";
import { DepreciationInput, DepreciationMethod as SharedDepreciationMethod } from "@mining/shared";
import { TenantPrismaService } from "../prisma/tenant-prisma.service";
import { DepreciationCalculator } from "../depreciation/depreciation-calculator";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { CreateValuationEventDto } from "./dto/create-valuation-event.dto";
import { UpdateUsageDto } from "./dto/update-usage.dto";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

@Injectable()
export class AssetsService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly calculator: DepreciationCalculator,
  ) {}

  async create(dto: CreateAssetDto) {
    if (
      (dto.depreciationMethod === DepreciationMethod.STRAIGHT_LINE ||
        dto.depreciationMethod === DepreciationMethod.DECLINING_BALANCE) &&
      !dto.usefulLifeYears
    ) {
      throw new BadRequestException("usefulLifeYears is required for this depreciation method");
    }
    if (dto.depreciationMethod === DepreciationMethod.UNITS_OF_PRODUCTION && !dto.totalExpectedUnits) {
      throw new BadRequestException("totalExpectedUnits is required for units-of-production");
    }

    return this.tenantPrisma.db.asset.create({
      data: {
        tenantId: this.tenantPrisma.tenantId,
        siteId: dto.siteId,
        categoryId: dto.categoryId,
        name: dto.name,
        serialNo: dto.serialNo,
        purchaseDate: dto.purchaseDate,
        purchaseValue: dto.purchaseValue,
        currentValue: dto.purchaseValue,
        depreciationMethod: dto.depreciationMethod,
        unitOfMeasure: dto.unitOfMeasure,
        status: dto.status,
        depreciationSchedule: {
          create: {
            method: dto.depreciationMethod,
            rate: dto.rate,
            usefulLifeYears: dto.usefulLifeYears,
            salvageValue: dto.salvageValue ?? 0,
            totalExpectedUnits: dto.totalExpectedUnits,
          },
        },
      },
      include: { depreciationSchedule: true },
    });
  }

  findAll() {
    return this.tenantPrisma.db.asset.findMany({
      orderBy: { name: "asc" },
      include: { site: true, category: true, depreciationSchedule: true },
    });
  }

  async findOne(id: string) {
    const asset = await this.tenantPrisma.db.asset.findUnique({
      where: { id },
      include: { site: true, category: true, depreciationSchedule: true },
    });
    if (!asset) throw new NotFoundException("Asset not found");
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto) {
    await this.findOne(id);
    return this.tenantPrisma.db.asset.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.tenantPrisma.db.asset.delete({ where: { id } });
  }

  async updateUsage(id: string, dto: UpdateUsageDto) {
    const asset = await this.findOne(id);
    if (!asset.depreciationSchedule) {
      throw new BadRequestException("Asset has no depreciation schedule");
    }
    return this.tenantPrisma.db.depreciationSchedule.update({
      where: { assetId: id },
      data: { unitsUsedToDate: dto.unitsUsedToDate },
    });
  }

  /** Runs the depreciation engine for one period and logs an immutable ValuationEvent. */
  async recalculateDepreciation(id: string, actorUserId?: string) {
    const asset = await this.findOne(id);
    const schedule = asset.depreciationSchedule;
    if (!schedule) {
      throw new BadRequestException("Asset has no depreciation schedule");
    }

    const purchaseValue = asset.purchaseValue.toNumber();
    const salvageValue = schedule.salvageValue.toNumber();
    const currentValue = asset.currentValue.toNumber();

    let input: DepreciationInput;
    switch (schedule.method) {
      case DepreciationMethod.STRAIGHT_LINE: {
        if (!schedule.usefulLifeYears) {
          throw new BadRequestException("Depreciation schedule is missing usefulLifeYears");
        }
        const yearsElapsed = (Date.now() - asset.purchaseDate.getTime()) / MS_PER_YEAR;
        input = {
          method: SharedDepreciationMethod.STRAIGHT_LINE,
          purchaseValue,
          salvageValue,
          usefulLifeYears: schedule.usefulLifeYears,
          yearsElapsed,
        };
        break;
      }
      case DepreciationMethod.DECLINING_BALANCE: {
        if (!schedule.usefulLifeYears) {
          throw new BadRequestException("Depreciation schedule is missing usefulLifeYears");
        }
        input = {
          method: SharedDepreciationMethod.DECLINING_BALANCE,
          currentBookValue: schedule.lastCalculatedValue?.toNumber() ?? currentValue,
          usefulLifeYears: schedule.usefulLifeYears,
          salvageValue,
          rate: schedule.rate?.toNumber(),
        };
        break;
      }
      case DepreciationMethod.UNITS_OF_PRODUCTION: {
        if (!schedule.totalExpectedUnits) {
          throw new BadRequestException("Depreciation schedule is missing totalExpectedUnits");
        }
        input = {
          method: SharedDepreciationMethod.UNITS_OF_PRODUCTION,
          purchaseValue,
          salvageValue,
          totalExpectedUnits: schedule.totalExpectedUnits.toNumber(),
          unitsUsedToDate: schedule.unitsUsedToDate.toNumber(),
        };
        break;
      }
    }

    const result = this.calculator.calculate(input);

    await this.tenantPrisma.db.asset.update({
      where: { id },
      data: { currentValue: result.currentValue },
    });
    await this.tenantPrisma.db.depreciationSchedule.update({
      where: { assetId: id },
      data: { lastCalculatedValue: result.currentValue, lastRunDate: new Date() },
    });
    const event = await this.tenantPrisma.db.valuationEvent.create({
      data: {
        assetId: id,
        type: ValuationEventType.DEPRECIATION,
        source: ValuationSource.SYSTEM_CALCULATED,
        amount: result.periodDepreciation,
        resultingValue: result.currentValue,
        createdBy: actorUserId,
      },
    });

    return event;
  }

  /** Manual appreciation/adjustment — always logged, never silently applied. */
  async addValuationEvent(id: string, dto: CreateValuationEventDto, actorUserId?: string) {
    if (dto.type === ValuationEventType.DEPRECIATION) {
      throw new BadRequestException(
        "DEPRECIATION events can only be created by the depreciation engine",
      );
    }

    const asset = await this.findOne(id);
    const resultingValue = asset.currentValue.toNumber() + dto.amount;

    await this.tenantPrisma.db.asset.update({
      where: { id },
      data: { currentValue: resultingValue },
    });
    const event = await this.tenantPrisma.db.valuationEvent.create({
      data: {
        assetId: id,
        type: dto.type,
        source: ValuationSource.MANUAL_ENTRY,
        amount: dto.amount,
        resultingValue,
        note: dto.note,
        createdBy: actorUserId,
      },
    });

    return event;
  }

  async listValuationEvents(id: string) {
    await this.findOne(id);
    return this.tenantPrisma.db.valuationEvent.findMany({
      where: { assetId: id },
      orderBy: { createdAt: "desc" },
    });
  }
}
