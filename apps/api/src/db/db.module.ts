import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createDb, type Database } from "@ctrlp/db";

export const DB = Symbol("DB");

@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Database =>
        createDb(config.getOrThrow<string>("DATABASE_URL")),
    },
  ],
  exports: [DB],
})
export class DbModule {}
