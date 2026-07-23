import { Body, Controller, Post } from "@nestjs/common";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { HubService } from "./hub.service.js";
import { type CheckDeliveryInput, checkDeliverySchema } from "@ctrlp/shared";

@Controller("delivery")
export class DeliveryController {
  constructor(private readonly hubs: HubService) {}

  /** Public serviceability check for a PIN code. */
  @Post("check")
  check(@Body(new ZodValidationPipe(checkDeliverySchema)) body: CheckDeliveryInput) {
    return this.hubs.checkServiceability(body.pincode);
  }
}
