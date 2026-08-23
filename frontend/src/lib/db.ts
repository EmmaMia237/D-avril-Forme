import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI ?? "";
const dbName = process.env.MONGODB_DB ?? "avril-forme";

if (!uri) {
  // Don't throw at import time; allow runtime error when used so devs can run without env during static analysis.
  console.warn("MONGODB_URI not set — database functions will fail until configured.");
}

let client: MongoClient | undefined;
let database: Db | undefined;

export async function connectDb(): Promise<Db> {
  if (database) return database;
  if (!client) client = new MongoClient(uri);
  await client.connect();
  database = client.db(dbName);
  return database;
}

export function getDb(): Db {
  if (!database) throw new Error("Database not connected. Call connectDb() first.");
  return database;
}
