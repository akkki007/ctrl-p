import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module.js";
import { AssetsModule } from "./assets/assets.module.js";
import { DbModule } from "./db/db.module.js";
import { HealthModule } from "./health/health.module.js";
import { OrdersModule } from "./orders/orders.module.js";
import { PaymentsModule } from "./payments/payments.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { WallModule } from "./wall/wall.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),
    DbModule,
    StorageModule,
    PaymentsModule,
    HealthModule,
    AssetsModule,
    OrdersModule,
    WallModule,
    AdminModule,
  ],
})
export class AppModule {}
