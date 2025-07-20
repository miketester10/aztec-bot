import { Redis } from "ioredis";
import { addSeconds, isAfter, getUnixTime } from "date-fns";
import { logger } from "../logger/logger";
import { config } from "dotenv";
config();

type SetOptions = {
  ttl?: number;
  smart?: boolean;
};

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

  /**
   * Stores a key-value pair in Redis with optional smart TTL logic.
   *
   * Validators quota resets at 21:45 UTC, so this method:
   * - If `options.smart` is false or omitted, sets a normal TTL (default 6 hours).
   * - If `options.smart` is true, limits expiration to today at 21:40 UTC if TTL exceeds that.
   *
   * @param key Redis key to set
   * @param value Value to store (will be JSON serialized)
   * @param options Optional settings:
   *   - `ttl` Time-to-live in seconds (default 21600 = 6 hours)
   *   - `smart` If true, forces expiration to max 21:40 UTC today
   */
  async set<T>(key: string, value: T, options?: SetOptions): Promise<void> {
    const ttl = options?.ttl ?? 21600;
    const smart = options?.smart ?? false;

    const serializedData = JSON.stringify(value);
    const now = new Date();

    if (smart) {
      // Calculate the "normal" expiration time by adding ttl seconds to now
      const expireAt = addSeconds(now, ttl);

      // Define the forced expiration time at 21:40 UTC today
      const todayAt2140UTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 21, 40, 0));

      // If the "normal" expiration time is after 21:40 UTC, force expiration to 21:40 UTC
      if (isAfter(expireAt, todayAt2140UTC)) {
        const unixExpire = getUnixTime(todayAt2140UTC); // Convert to Unix timestamp in seconds
        await this.redis.set(key, serializedData);
        await this.redis.expireat(key, unixExpire); // Force expiration at 21:40 UTC
        logger.info(`[Redis:set] Key "${key}" set with smart TTL, expiring at 21:40 UTC (Validators quota reset)`);
        return;
      }
    }

    // If not smart or TTL is before the forced expiration, set with normal TTL
    await this.redis.set(key, serializedData, "EX", ttl);
    logger.info(`[Redis:set] Key "${key}" set with standard TTL: ${ttl} seconds`);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.redis.exists(key);
    return exists === 1;
  }
}
