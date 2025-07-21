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
    if (parsedData) logger.warn(`[Redis:GET] Key "${key}" fetched`);
    return parsedData;
  }

  /**
   * Stores a key-value pair in Redis with optional smart TTL logic.
   *
   * Validators quota resets at 21:45 UTC, so this method:
   * - If `options.smart` is false or omitted, sets a normal TTL (default 6 hours).
   * - If `options.smart` is true:
   *    - Between 00:00 and 21:39 UTC: limits expiration to max 21:40 UTC today.
   *    - Between 21:40 and 21:49 UTC: skips setting the cache entirely (to avoid stale data).
   *    - From 21:50 UTC onward: sets TTL normally.
   *
   * @param key Redis key to set
   * @param value Value to store (will be JSON serialized)
   * @param options Optional settings:
   *   - `ttl` Time-to-live in seconds (default 21600 = 6 hours)
   *   - `smart` If true, enables special cache timing around quota reset
   */
  async set<T>(key: string, value: T, options?: SetOptions): Promise<void> {
    const ttl = options?.ttl ?? 21600;
    const smart = options?.smart ?? false;

    const serializedData = JSON.stringify(value);
    const now = new Date();

    if (smart) {
      // Define the window in UTC for special logic: 21:40 - 21:50 UTC
      const todayAt2140UTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 21, 40, 0));
      const todayAt2150UTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 21, 50, 0));

      if (now >= todayAt2140UTC && now < todayAt2150UTC) {
        // Between 21:40 and 21:50 UTC: skip caching to avoid stale data from API
        logger.warn(`[Redis:SET] Key "${key}" NOT cached due to smart TTL window (21:40–21:50 UTC — live update window)`);
        return;
      }

      if (now < todayAt2140UTC) {
        // Calculate when the key would normally expire
        const expireAt = addSeconds(now, ttl);

        // If normal expiration would go beyond 21:40 UTC, cap it at 21:40 UTC
        if (isAfter(expireAt, todayAt2140UTC)) {
          const unixExpire = getUnixTime(todayAt2140UTC); // Convert to Unix timestamp in seconds
          await this.redis.set(key, serializedData, "EXAT", unixExpire); // Force expiration at 21:40 UTC
          logger.warn(`[Redis:SET] Key "${key}" set with smart TTL, expiring at 21:40 UTC (Validators quota reset)`);
          return;
        }
      }

      // (now >= 21:50 UTC) From 21:50 UTC: allow standard TTL to be set
    }

    // Standard TTL behavior (either smart: false or no special time handling needed)
    await this.redis.set(key, serializedData, "EX", ttl);
    logger.warn(`[Redis:SET] Key "${key}" set with standard TTL: ${ttl} seconds`);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
    logger.warn(`[Redis:DELETE] Key "${key}" deleted`);
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.redis.exists(key);
    logger.warn(`[Redis:HAS] Key "${key}" exists: ${exists === 1}`);
    return exists === 1;
  }
}
