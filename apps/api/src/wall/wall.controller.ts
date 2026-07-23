import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthedUser } from "../auth/session.guard.js";
import { SessionGuard } from "../auth/session.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { WallService } from "./wall.service.js";
import {
  type PublishDesignInput,
  type ReportDesignInput,
  type WallQuery,
  publishDesignSchema,
  reportDesignSchema,
  wallQuerySchema,
} from "@ctrlp/shared";

@Controller("wall")
export class WallController {
  constructor(private readonly wall: WallService) {}

  /** Public gallery. */
  @Get()
  gallery(@Query(new ZodValidationPipe(wallQuerySchema)) query: WallQuery) {
    return this.wall.gallery(query);
  }

  @UseGuards(SessionGuard)
  @Post()
  publish(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(publishDesignSchema)) body: PublishDesignInput,
  ) {
    return this.wall.publish(user.id, body);
  }

  /** Declared before ":id" so it isn't captured as a design id. */
  @UseGuards(SessionGuard)
  @Get("mine")
  mine(@CurrentUser() user: AuthedUser) {
    return this.wall.myDesigns(user.id);
  }

  /** Public design detail. */
  @Get(":id")
  getDesign(@Param("id", ParseUUIDPipe) id: string) {
    return this.wall.getDesign(id);
  }

  @UseGuards(SessionGuard)
  @Delete(":id")
  unpublish(@CurrentUser() user: AuthedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.wall.unpublish(user.id, id);
  }

  @UseGuards(SessionGuard)
  @Post(":id/report")
  report(
    @CurrentUser() user: AuthedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reportDesignSchema)) body: ReportDesignInput,
  ) {
    return this.wall.reportDesign(user.id, id, body);
  }
}

@Controller("creators")
export class CreatorsController {
  constructor(private readonly wall: WallService) {}

  /** Public, shareable creator page. */
  @Get(":handle")
  profile(@Param("handle") handle: string) {
    return this.wall.creatorByHandle(handle);
  }
}

@UseGuards(SessionGuard)
@Controller("wallet")
export class WalletController {
  constructor(private readonly wall: WallService) {}

  @Get()
  wallet(@CurrentUser() user: AuthedUser) {
    return this.wall.wallet(user.id);
  }
}
