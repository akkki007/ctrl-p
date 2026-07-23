import { Module } from "@nestjs/common";
import { CourierService } from "./courier.service.js";
import { DeliveryController } from "./delivery.controller.js";
import { HubService } from "./hub.service.js";

@Module({
  controllers: [DeliveryController],
  providers: [HubService, CourierService],
  exports: [HubService, CourierService],
})
export class ShippingModule {}
