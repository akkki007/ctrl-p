import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client as MinioClient } from "minio";

/** Logical buckets, resolved from env at construction. */
export type BucketKind = "uploads" | "printReady" | "previews";

/**
 * Thin wrapper over the MinIO client. All object bytes live here — Postgres
 * only ever stores metadata (bucket + object key). Presigned URLs let the
 * browser upload and download directly without proxying bytes through the API.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: MinioClient;
  private readonly buckets: Record<BucketKind, string>;

  constructor(config: ConfigService) {
    const endpoint = new URL(config.get<string>("S3_ENDPOINT") ?? "http://localhost:9000");

    this.client = new MinioClient({
      endPoint: endpoint.hostname,
      port: Number(endpoint.port) || (endpoint.protocol === "https:" ? 443 : 80),
      useSSL: endpoint.protocol === "https:",
      accessKey: config.get<string>("S3_ACCESS_KEY") ?? "ctrlp_minio",
      secretKey: config.get<string>("S3_SECRET_KEY") ?? "ctrlp_dev_password",
      region: config.get<string>("S3_REGION") ?? "us-east-1",
    });

    this.buckets = {
      uploads: config.get<string>("S3_BUCKET_UPLOADS") ?? "uploads",
      printReady: config.get<string>("S3_BUCKET_PRINT_READY") ?? "print-ready",
      previews: config.get<string>("S3_BUCKET_PREVIEWS") ?? "previews",
    };
  }

  bucketFor(kind: BucketKind): string {
    return this.buckets[kind];
  }

  /** Presigned PUT the browser uploads the original file to. */
  presignedPut(kind: BucketKind, objectKey: string, expirySeconds = 15 * 60): Promise<string> {
    return this.client.presignedPutObject(this.bucketFor(kind), objectKey, expirySeconds);
  }

  /** Presigned GET for previews / admin print-file download. */
  presignedGet(kind: BucketKind, objectKey: string, expirySeconds = 15 * 60): Promise<string> {
    return this.client.presignedGetObject(this.bucketFor(kind), objectKey, expirySeconds);
  }

  /** True once the object actually exists (used to confirm an upload landed). */
  async objectExists(kind: BucketKind, objectKey: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketFor(kind), objectKey);
      return true;
    } catch {
      return false;
    }
  }

  /** Fetch the full object into a buffer — used to read image dimensions. */
  async getObjectBuffer(kind: BucketKind, objectKey: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucketFor(kind), objectKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }
}
