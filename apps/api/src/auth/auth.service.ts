import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { TenantPrismaService } from "../prisma/tenant-prisma.service";
import { JwtPayload } from "./jwt.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    // Scoped to the current tenant transaction — RLS guarantees this can
    // never match a user belonging to a different tenant, even if the
    // email string collides.
    const user = await this.tenantPrisma.db.user.findFirst({
      where: { email, tenantId: this.tenantPrisma.tenantId },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        siteId: user.siteId,
      },
    };
  }
}
