import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { SessionGuard, type AuthedRequest } from "./session.guard.js";

/** Parse the ADMIN_EMAILS allowlist (comma-separated) into a lowercased set. */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Requires a valid session AND membership in the ADMIN_EMAILS allowlist.
 * Extends {@link SessionGuard} so the ops panel is gated in one annotation.
 * Phase 1 keeps admin identity in an env allowlist; a role column can replace
 * this once the better-auth admin plugin lands.
 */
@Injectable()
export class AdminGuard extends SessionGuard implements CanActivate {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const email = req.user?.email?.toLowerCase();

    if (!email || !adminEmails().has(email)) {
      throw new ForbiddenException("Admin access required");
    }
    return true;
  }
}
