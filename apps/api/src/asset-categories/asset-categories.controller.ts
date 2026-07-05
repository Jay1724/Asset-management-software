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
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AssetCategoriesService } from "./asset-categories.service";
import { CreateAssetCategoryDto } from "./dto/create-asset-category.dto";
import { UpdateAssetCategoryDto } from "./dto/update-asset-category.dto";

@Controller("asset-categories")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetCategoriesController {
  constructor(private readonly categoriesService: AssetCategoriesService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateAssetCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateAssetCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.categoriesService.remove(id);
  }
}
