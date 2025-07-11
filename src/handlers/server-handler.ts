import express, { Request, Response, NextFunction } from "express";
import { logger } from "../logger/logger";
import {
  Bot,
  code,
  format,
  TelegramBotCommand,
  TelegramUpdate,
  webhookHandler,
} from "gramio";
import { Server } from "http";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { Redis } from "ioredis";
import { config } from "dotenv";
import { roles } from "../consts/roles";
config();

export class ServerHandler {
  readonly SECRET_TOKEN: string = process.env.SECRET_TOKEN!;
  readonly WEBHOOK_URL: string = process.env.WEBHOOK_URL!;
  readonly WEBHOOK_PATH: string = process.env.WEBHOOK_PATH!;
  private readonly REDIS_HOST: string = process.env.REDIS_HOST!;
  private readonly REDIS_PORT: number = Number(process.env.REDIS_PORT!);
  private readonly EXPRESS_PORT: number = Number(process.env.EXPRESS_PORT!);

  private static _instance: ServerHandler;
  private readonly app: express.Application = express();
  private bot: Bot | undefined;
  private allowedCommands: string[] | undefined;
  private rateLimiter: RateLimiterRedis;

  private constructor() {
    // Setup Redis client
    const redisClient = new Redis({
      host: this.REDIS_HOST,
      port: this.REDIS_PORT,
      enableOfflineQueue: false,
    })
      .on("connect", () => {
        logger.info("✅ Connected to Redis");
      })
      .on("error", (err) => {
        logger.error(`❌ Error connecting to Redis: ${err.message}`);
      });

    // Setup Rate limiter for Telegram users
    this.rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "rl_user",
      points: 15, // Max 15 requests
      duration: 600, // Per 10 minutes (600 seconds)
      blockDuration: 1800, // Block for 30 minute (1800 seconds)
    });
  }

  static getInstance(): ServerHandler {
    if (!ServerHandler._instance) {
      ServerHandler._instance = new ServerHandler();
    }
    return ServerHandler._instance;
  }

  async startServer(bot: Bot): Promise<Server> {
    // Assign bot instance
    this.bot = bot;
    // Load commands
    await this.loadCommands().catch((error) => {
      logger.error(
        `❌ Unknown Error while loading commands:: ${(error as Error).message}`
      );
    });

    // Setup Middleware
    this.app.use(express.json());
    // this.app.use((req: Request, res: Response, next: NextFunction) => {
    //   logger.info(`${req.method} ${req.url}`);
    //   next();
    // });

    // Setup Health route
    this.app.get("/health", (req: Request, res: Response) => {
      res.status(200).json({ status: "OK" });
    });

    // Setup Webhook route
    this.app.post(
      `/${this.WEBHOOK_PATH}`,
      this.webhookMiddleware.bind(this), // .bind(this) if need to access class properties/methods inside the middleware
      this.rateLimiterMiddleware.bind(this),
      webhookHandler(bot, "express", this.SECRET_TOKEN)
    );

    // Start the server and resolve the Promise only when the server is ready to receive requests
    return new Promise<Server>((resolve, reject) => {
      const server = this.app.listen(this.EXPRESS_PORT, () => {
        logger.info(`✅ Webhook server ready on port ${this.EXPRESS_PORT}`);
        resolve(server);
      });

      server.on("error", (error) => {
        logger.error(`❌ Server failed to start: ${error.message}`);
        reject(error);
      });
    });
  }

  private webhookMiddleware(
    req: Request<{}, {}, TelegramUpdate>,
    res: Response,
    next: NextFunction
  ): void {
    const tokenFromHeader = req.header("x-telegram-bot-api-secret-token");
    const { message } = req.body;

    if (!tokenFromHeader || tokenFromHeader !== this.SECRET_TOKEN) {
      logger.warn(
        "Unauthorized webhook request: missing or invalid Secret Token."
      );
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    logger.info(
      `Received webhook update: ${JSON.stringify(
        {
          user_id: message?.from?.id,
          firstname: message?.from?.first_name,
          username: message?.from?.username,
          language: message?.from?.language_code,
          text: message?.text,
        },
        null,
        2
      )}`
    );
    next();
  }

  private async rateLimiterMiddleware(
    req: Request<{}, {}, TelegramUpdate>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { message } = req.body;
    const userID = message?.from?.id!;
    const text = message?.text?.trim();
    const command = text?.split(" ")[0];

    // If allowed commands are loaded, check if the command is valid
    // Otherwise, fallback: treat all messages as valid (apply rate limiter to everything)
    const isValidCommand =
      Array.isArray(this.allowedCommands) && this.allowedCommands.length > 0
        ? this.allowedCommands.includes(command!)
        : true;

    if (!isValidCommand || userID === roles.ADMIN) {
      return next(); // Skip rate limit if it's not a recognized command or if the user is an admin
    }

    try {
      // Consume 1 point from the rate limiter for this user
      await this.rateLimiter.consume(userID, 1);
      return next();
    } catch (error) {
      // Rate limit exceeded: respond with 200 to prevent Telegram retries
      res.sendStatus(200);
      logger.warn(`Rate limit exceeded for user ${message?.from?.id}`);

      const formattedText = format`${code(
        "🚫 Please do not abuse the bot. Rate limit exceeded. Try again later."
      )}`;

      await this.bot?.api.sendMessage({
        chat_id: message?.from?.id!,
        text: formattedText,
        reply_parameters: { message_id: message?.message_id! },
      });
    }
  }

  private async loadCommands(): Promise<void> {
    const commands: TelegramBotCommand[] | undefined =
      await this.bot?.api.getMyCommands();
    this.allowedCommands = commands?.map(
      (c: TelegramBotCommand) => `/${c.command}`
    );
  }
}
