import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthedUser } from "../auth/session.guard.js";
import { SessionGuard } from "../auth/session.guard.js";
import { LoyaltyService } from "./loyalty.service.js";

@UseGuards(SessionGuard)
@Controller("loyalty")
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get()
  view(@CurrentUser() user: AuthedUser) {
    return this.loyalty.view(user.id);
  }
}
