import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedUser } from "../jwt.types";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
