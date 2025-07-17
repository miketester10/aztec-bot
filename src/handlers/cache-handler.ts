import { Redis } from "ioredis";
import { logger } from "../logger/logger";
import { config } from "dotenv";
config();

export class CacheHandler {
  private readonly REDIS_HOST: string = process.env.REDIS_HOST!;
  private readonly REDIS_PASSWORD: string = process.env.REDIS_PASSWORD!;
  private readonly REDIS_PORT: number = Number(process.env.REDIS_PORT!);

  private static instance: CacheHandler;
  readonly redis: Redis;

  private constructor() {
    this.redis = new Redis({
      host: this.REDIS_HOST,
      password: this.REDIS_PASSWORD,
      port: this.REDIS_PORT,
      enableOfflineQueue: false,
    })
      .on("connect", () => {
        logger.info("✅ Connected to Redis");
      })
      .on("error", (err) => {
        logger.error(`❌ Error connecting to Redis: ${err.message}`);
      });
  }

  public static getInstance(): CacheHandler {
    if (!CacheHandler.instance) {
      CacheHandler.instance = new CacheHandler();
    }
    return CacheHandler.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    const parsedData = data ? (JSON.parse(data) as T) : null;
    return parsedData;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.redis.set(key, serialized);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.redis.exists(key);
    return exists === 1;
  }
}
