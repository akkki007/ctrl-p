import { type ExecutionContext, createParamDecorator } from "@nestjs/common";
import type { AuthedRequest, AuthedUser } from "./session.guard.js";

/**
 * Injects the authenticated user attached by {@link SessionGuard}.
 * Only valid on handlers guarded by SessionGuard/AdminGuard.
 *
 * ```ts
 * @UseGuards(SessionGuard)
 * @Get()
 * list(@CurrentUser() user: AuthedUser) { ... }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthedUser => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user) {
      throw new Error("CurrentUser used without SessionGuard");
    }
    return req.user;
  },
);
