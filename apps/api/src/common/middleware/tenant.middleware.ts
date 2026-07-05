import { Injectable, NestMiddleware, NotFoundException } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { PrismaService } from "../../prisma/prisma.service";

declare module "express" {
  interface Request {
    tenantId?: string;
    tenantSubdomain?: string;
  }
}

/**
 * Resolves the tenant from the request Host header (subdomain.example.com)
 * or an explicit X-Tenant-Subdomain header (used in local dev, where
 * subdomains are awkward to wire up against localhost). The Tenant table
 * itself has no RLS policy, so this query uses the base PrismaService
 * directly rather than a tenant-scoped transaction.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const subdomain = this.extractSubdomain(req);

    if (!subdomain) {
      throw new NotFoundException("Unable to resolve tenant from request");
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { subdomain } });
    if (!tenant) {
      throw new NotFoundException(`Unknown tenant: ${subdomain}`);
    }

    req.tenantId = tenant.id;
    req.tenantSubdomain = tenant.subdomain;
    next();
  }

  private extractSubdomain(req: Request): string | null {
    const explicit = req.headers["x-tenant-subdomain"];
    if (typeof explicit === "string" && explicit.length > 0) {
      return explicit;
    }

    const host = req.hostname;
    if (!host) return null;

    const parts = host.split(".");
    // "acme.miningplatform.com" -> "acme"; bare "localhost" has no subdomain.
    if (parts.length < 3) return null;
    return parts[0];
  }
}
