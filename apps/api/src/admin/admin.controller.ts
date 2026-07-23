import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { AdminGuard } from "../auth/admin.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthedUser } from "../auth/session.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { CouponService } from "../coupons/coupon.service.js";
import { PayoutService } from "../payouts/payout.service.js";
import { AdminService } from "./admin.service.js";
import { ModerationService } from "./moderation.service.js";
import {
  type CreateCouponInput,
  type DesignStatus,
  type ModerateDesignInput,
  type OrderStatus,
  type PayoutStatus,
  type ProcessPayoutInput,
  type ReportStatus,
  type ResolveReportInput,
  type UpdateOrderStatusInput,
  createCouponSchema,
  designStatusSchema,
  moderateDesignSchema,
  orderStatusSchema,
  payoutStatusSchema,
  processPayoutSchema,
  reportStatusSchema,
  resolveReportSchema,
  updateOrderStatusSchema,
} from "@ctrlp/shared";

const setActiveSchema = z.object({ active: z.boolean() });
type SetActiveInput = z.infer<typeof setActiveSchema>;

@UseGuards(AdminGuard)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly moderation: ModerationService,
    private readonly coupons: CouponService,
    private readonly payouts: PayoutService,
  ) {}

  /** Ops order queue. `?status=printing` filters to a single stage. */
  @Get("orders")
  listOrders(@Query("status") status?: string) {
    const parsed = status ? orderStatusSchema.parse(status) : undefined;
    return this.admin.listOrders(parsed as OrderStatus | undefined);
  }

  @Get("orders/:id")
  getOrder(@Param("id", ParseUUIDPipe) id: string) {
    return this.admin.getOrder(id);
  }

  @Patch("orders/:id/status")
  updateStatus(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateOrderStatusSchema)) body: UpdateOrderStatusInput,
  ) {
    return this.admin.updateStatus(id, user.id, body);
  }

  /** Presigned download URL for a line item's print-ready original. */
  @Get("orders/:id/items/:itemId/print-file")
  printFile(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
  ) {
    return this.admin.printFileUrl(id, itemId);
  }

  // ── Wall moderation ─────────────────────────────────────────

  /** Moderation queue. `?status=pending` (default) | approved | rejected | removed. */
  @Get("designs")
  listDesigns(@Query("status") status?: string) {
    const parsed = status ? designStatusSchema.parse(status) : undefined;
    return this.moderation.listDesigns(parsed as DesignStatus | undefined);
  }

  @Patch("designs/:id/moderate")
  moderate(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(moderateDesignSchema)) body: ModerateDesignInput,
  ) {
    return this.moderation.moderateDesign(user.id, id, body);
  }

  /** Report queue. `?status=open` (default) | upheld | dismissed. */
  @Get("reports")
  listReports(@Query("status") status?: string) {
    const parsed = status ? reportStatusSchema.parse(status) : undefined;
    return this.moderation.listReports(parsed as ReportStatus | undefined);
  }

  @Patch("reports/:id/resolve")
  resolveReport(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(resolveReportSchema)) body: ResolveReportInput,
  ) {
    return this.moderation.resolveReport(user.id, id, body);
  }

  // ── Coupons / deals ─────────────────────────────────────────

  @Get("coupons")
  listCoupons() {
    return this.coupons.list();
  }

  @Post("coupons")
  createCoupon(@Body(new ZodValidationPipe(createCouponSchema)) body: CreateCouponInput) {
    return this.coupons.create(body);
  }

  @Patch("coupons/:id")
  setCouponActive(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(setActiveSchema)) body: SetActiveInput,
  ) {
    return this.coupons.setActive(id, body.active);
  }

  // ── Payouts ─────────────────────────────────────────────────

  @Get("payouts")
  listPayouts(@Query("status") status?: string) {
    const parsed = status ? payoutStatusSchema.parse(status) : undefined;
    return this.payouts.listAll(parsed as PayoutStatus | undefined);
  }

  @Patch("payouts/:id")
  processPayout(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(processPayoutSchema)) body: ProcessPayoutInput,
  ) {
    return this.payouts.process(user.id, id, body);
  }
}
