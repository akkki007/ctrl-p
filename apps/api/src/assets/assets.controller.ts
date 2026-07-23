import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthedUser } from "../auth/session.guard.js";
import { SessionGuard } from "../auth/session.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { AssetsService } from "./assets.service.js";
import {
  type FinalizeAssetInput,
  type UploadIntentInput,
  finalizeAssetSchema,
  uploadIntentSchema,
} from "@ctrlp/shared";

@UseGuards(SessionGuard)
@Controller("assets")
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  /** Step 1 — get a presigned URL to upload the original file to. */
  @Post("upload-intent")
  uploadIntent(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(uploadIntentSchema)) body: UploadIntentInput,
  ) {
    return this.assets.createUploadIntent(user.id, body);
  }

  /** Step 2 — confirm the upload and persist server-read metadata. */
  @Post("finalize")
  finalize(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(finalizeAssetSchema)) body: FinalizeAssetInput,
  ) {
    return this.assets.finalize(user.id, body.objectKey);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.assets.getOwned(user.id, id);
  }
}
