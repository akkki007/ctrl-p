import { randomBytes } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ShipmentInfo } from "@ctrlp/shared";

/**
 * Courier integration. With no provider configured it runs in mock mode:
 * generates a tracking number and a tracking URL from a template. Swap
 * {@link book} for a real courier API (Delhivery/Shiprocket/etc.) here.
 */
@Injectable()
export class CourierService {
  private readonly logger = new Logger(CourierService.name);
  private readonly courierName: string;
  private readonly trackingUrlTemplate: string;

  constructor(config: ConfigService) {
    this.courierName = config.get<string>("COURIER_NAME") ?? "ctrlp Express";
    this.trackingUrlTemplate =
      config.get<string>("COURIER_TRACKING_URL") ?? "https://track.ctrlp.local/{tracking}";
  }

  /** Book a shipment and return its tracking details. */
  book(orderId: string, hubCity: string | null): ShipmentInfo {
    const trackingNumber = `CTRLP${randomBytes(5).toString("hex").toUpperCase()}`;
    const trackingUrl = this.trackingUrlTemplate.replace("{tracking}", trackingNumber);
    this.logger.log(
      `Booked shipment for order ${orderId} from ${hubCity ?? "hub"} → ${trackingNumber}`,
    );
    return { courierName: this.courierName, trackingNumber, trackingUrl };
  }
}
