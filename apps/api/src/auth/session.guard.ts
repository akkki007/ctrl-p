import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";

/** The authenticated principal attached to the request by {@link SessionGuard}. */
export interface AuthedUser {
  id: string;
  email: string;
  name: string;
}

/** Express request augmented with the resolved better-auth principal. */
export interface AuthedRequest extends Request {
  user?: AuthedUser;
}

/**
 * Resolves the better-auth session from the incoming cookies/headers and
 * attaches the user to the request. Rejects with 401 when no valid session
 * exists. Apply with `@UseGuards(SessionGuard)`.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    const result = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!result?.user) {
      throw new UnauthorizedException("Sign in to continue");
    }

    req.user = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    };
    return true;
  }
}
