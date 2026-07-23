import { Body, Controller, Post } from "@nestjs/common";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { BulkService } from "./bulk.service.js";
import { type CreateBulkQuoteInput, createBulkQuoteSchema } from "@ctrlp/shared";

@Controller("bulk-quotes")
export class BulkController {
  constructor(private readonly bulk: BulkService) {}

  /** Public B2B / bulk enquiry submission. */
  @Post()
  create(@Body(new ZodValidationPipe(createBulkQuoteSchema)) body: CreateBulkQuoteInput) {
    return this.bulk.create(body);
  }
}
