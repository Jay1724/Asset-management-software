import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/jwt.types";
import { AssetsService } from "./assets.service";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { CreateValuationEventDto } from "./dto/create-valuation-event.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { UpdateUsageDto } from "./dto/update-usage.dto";

@Controller("assets")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SITE_MANAGER)
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Get()
  findAll() {
    return this.assetsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.SITE_MANAGER)
  update(@Param("id") id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.assetsService.remove(id);
  }

  @Patch(":id/usage")
  @Roles(Role.ADMIN, Role.SITE_MANAGER, Role.TECHNICIAN)
  updateUsage(@Param("id") id: string, @Body() dto: UpdateUsageDto) {
    return this.assetsService.updateUsage(id, dto);
  }

  @Post(":id/depreciation/recalculate")
  @Roles(Role.ADMIN, Role.SITE_MANAGER)
  recalculateDepreciation(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assetsService.recalculateDepreciation(id, user.sub);
  }

  @Post(":id/valuation-events")
  @Roles(Role.ADMIN)
  addValuationEvent(
    @Param("id") id: string,
    @Body() dto: CreateValuationEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assetsService.addValuationEvent(id, dto, user.sub);
  }

  @Get(":id/valuation-events")
  listValuationEvents(@Param("id") id: string) {
    return this.assetsService.listValuationEvents(id);
  }
}
