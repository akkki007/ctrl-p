import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthedUser } from "../auth/session.guard.js";
import { SessionGuard } from "../auth/session.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { OrdersService } from "./orders.service.js";
import {
  type CreateOrderInput,
  type VerifyPaymentInput,
  createOrderSchema,
  verifyPaymentSchema,
} from "@ctrlp/shared";

@UseGuards(SessionGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput,
  ) {
    return this.orders.create(user.id, body);
  }

  @Post(":id/verify-payment")
  verifyPayment(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(verifyPaymentSchema)) body: VerifyPaymentInput,
  ) {
    return this.orders.verifyPayment(user.id, id, body);
  }

  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.orders.listForUser(user.id);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.orders.getForUser(user.id, id);
  }
}
