import { type ArgumentMetadata, BadRequestException, type PipeTransform } from "@nestjs/common";
import { ZodError, type ZodSchema } from "zod";

/**
 * Validates and narrows a request payload against a zod schema — the same
 * schemas the web client uses, imported from `@ctrlp/shared`. On failure it
 * throws a 400 with a flattened list of field errors.
 *
 * ```ts
 * @Post()
 * create(@Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput) {}
 * ```
 */
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    try {
      return this.schema.parse(value);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException({
          message: "Validation failed",
          errors: err.flatten().fieldErrors,
        });
      }
      throw err;
    }
  }
}
