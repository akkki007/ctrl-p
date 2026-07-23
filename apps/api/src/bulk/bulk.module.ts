import { Module } from "@nestjs/common";
import { BulkController } from "./bulk.controller.js";
import { BulkService } from "./bulk.service.js";

@Module({
  controllers: [BulkController],
  providers: [BulkService],
  exports: [BulkService],
})
export class BulkModule {}
