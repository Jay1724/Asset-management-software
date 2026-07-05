import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService } from "../prisma/tenant-prisma.service";
import { CreateAssetCategoryDto } from "./dto/create-asset-category.dto";
import { UpdateAssetCategoryDto } from "./dto/update-asset-category.dto";

@Injectable()
export class AssetCategoriesService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  create(dto: CreateAssetCategoryDto) {
    return this.tenantPrisma.db.assetCategory.create({
      data: { ...dto, tenantId: this.tenantPrisma.tenantId },
    });
  }

  findAll() {
    return this.tenantPrisma.db.assetCategory.findMany({ orderBy: { name: "asc" } });
  }

  async findOne(id: string) {
    const category = await this.tenantPrisma.db.assetCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Asset category not found");
    return category;
  }

  async update(id: string, dto: UpdateAssetCategoryDto) {
    await this.findOne(id);
    return this.tenantPrisma.db.assetCategory.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.tenantPrisma.db.assetCategory.delete({ where: { id } });
  }
}
