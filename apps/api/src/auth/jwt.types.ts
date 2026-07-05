import { Role } from "@prisma/client";

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: Role;
  email: string;
}

export interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: Role;
  email: string;
}
