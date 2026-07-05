import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthenticatedUser, JwtPayload } from "../jwt.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET"),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): AuthenticatedUser {
    // Defense in depth: a valid JWT minted for tenant A must never be
    // honored against tenant B's subdomain, even though RLS would also
    // stop any resulting queries from returning tenant B's data.
    if (req.tenantId && payload.tenantId !== req.tenantId) {
      throw new UnauthorizedException("Token does not match tenant");
    }
    return payload;
  }
}
