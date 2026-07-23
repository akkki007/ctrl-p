import type { Database } from "@ctrlp/db";

/** The transaction handle drizzle passes to `db.transaction(async (tx) => …)`. */
export type DbTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Either the pooled db or an open transaction — for helpers that run in both. */
export type DbExecutor = Database | DbTx;
