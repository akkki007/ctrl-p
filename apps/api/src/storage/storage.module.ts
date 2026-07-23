import { Global, Module } from "@nestjs/common";
import { StorageService } from "./storage.service.js";

/** Storage is app-wide infrastructure, so the service is global. */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
