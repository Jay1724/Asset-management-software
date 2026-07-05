import { Controller, Get, Req } from "@nestjs/common";
import { Request } from "express";
import { TenantTheme } from "@mining/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

@Controller("tenant")
export class TenantController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public, unauthenticated endpoint: the Next.js app calls this on every
   * SSR request (resolved via the same Host header the API middleware
   * uses) to get branding before a user has logged in.
   */
  @Get("theme")
  async getTheme(@Req() req: Request): Promise<TenantTheme> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: req.tenantId } });
    if (!tenant) {
      throw new NotFoundException("Unknown tenant");
    }

    return {
      subdomain: tenant.subdomain,
      name: tenant.name,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      fontFamily: tenant.fontFamily,
    };
  }
}
