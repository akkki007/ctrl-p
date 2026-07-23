import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthedUser } from "../auth/session.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { AdminService } from "./admin.service.js";
import {
  type OrderStatus,
  type UpdateOrderStatusInput,
  orderStatusSchema,
  updateOrderStatusSchema,
} from "@ctrlp/shared";

@UseGuards(AdminGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

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
}
