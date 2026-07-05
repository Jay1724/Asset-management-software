import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantPrismaService } from "../prisma/tenant-prisma.service";
import { CreateSiteDto } from "./dto/create-site.dto";
import { UpdateSiteDto } from "./dto/update-site.dto";

@Injectable()
export class SitesService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  create(dto: CreateSiteDto) {
    return this.tenantPrisma.db.site.create({
      data: { ...dto, tenantId: this.tenantPrisma.tenantId },
    });
  }

  findAll() {
    return this.tenantPrisma.db.site.findMany({ orderBy: { name: "asc" } });
  }

  async findOne(id: string) {
    const site = await this.tenantPrisma.db.site.findUnique({ where: { id } });
    if (!site) throw new NotFoundException("Site not found");
    return site;
  }

  async update(id: string, dto: UpdateSiteDto) {
    await this.findOne(id);
    return this.tenantPrisma.db.site.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.tenantPrisma.db.site.delete({ where: { id } });
  }
}
