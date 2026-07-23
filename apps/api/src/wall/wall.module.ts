import { Module } from "@nestjs/common";
import {
  CreatorsController,
  WallController,
  WalletController,
} from "./wall.controller.js";
import { WallService } from "./wall.service.js";

@Module({
  controllers: [WallController, CreatorsController, WalletController],
  providers: [WallService],
  exports: [WallService],
})
export class WallModule {}
