import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthedUser } from "../auth/session.guard.js";
import { SessionGuard } from "../auth/session.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { CouponService } from "./coupon.service.js";

const previewSchema = z.object({
  code: z.string().trim().min(3).max(32),
  subtotalPaise: z.number().int().min(0),
});
type PreviewInput = z.infer<typeof previewSchema>;

@Controller("coupons")
export class CouponController {
  constructor(private readonly coupons: CouponService) {}

  /** Current auto-apply deals (public). */
  @Get("deals")
  deals() {
    return this.coupons.deals();
  }

  /** Validate a code against the current cart subtotal (re-checked at checkout). */
  @UseGuards(SessionGuard)
  @Post("preview")
  preview(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(previewSchema)) body: PreviewInput,
  ) {
    return this.coupons.preview(user.id, body.code, body.subtotalPaise);
  }
}
