import express, { Request, Response, NextFunction } from "express";
import { logger } from "./logger/logger";
import { Bot, TelegramUpdate, webhookHandler } from "gramio";
import { Server } from "http";
import { config } from "dotenv";
config();

export class ServerHandler {
  private static _instance: ServerHandler;
  private readonly app: express.Application = express();
  readonly SECRET_TOKEN: string = process.env.SECRET_TOKEN!;
  readonly WEBHOOK_URL: string = process.env.WEBHOOK_URL!;
  readonly WEBHOOK_PATH: string = process.env.WEBHOOK_PATH!;
  readonly PORT: number = Number(process.env.PORT);

  private constructor() {}

  static getInstance(): ServerHandler {
    if (!ServerHandler._instance) {
      ServerHandler._instance = new ServerHandler();
    }
    return ServerHandler._instance;
  }

  async startServer(bot: Bot): Promise<Server> {
    // Setup Middleware
    this.app.use(express.json());
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.url}`);
      next();
    });

    // Setup Health route
    this.app.get("/health", (req: Request, res: Response) => {
      res.status(200).json({ status: "OK" });
    });

    // Setup Webhook route
    this.app.post(
      `/${this.WEBHOOK_PATH}`,
      this.webhookMiddleware.bind(this), // .bind(this) if need to access class properties/methods inside the middleware
      webhookHandler(bot, "express", this.SECRET_TOKEN)
    );

    // Start server
    const server = this.app.listen(this.PORT, () => {
      logger.info(
        `## [WEBHOOK MODE] Server listening on port ${this.PORT}  ##`
      );
    });

    return server;
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
}
