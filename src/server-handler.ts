import express, { Request, Response, NextFunction } from "express";
import { logger } from "./logger/logger";
import { Bot, webhookHandler } from "gramio";
import { Server } from "http";
import { config } from "dotenv";
config();

export class ServerHandler {
  private static _instance: ServerHandler;
  private readonly app: express.Application = express();
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
      logger.info(
        `${req.method} ${req.url} ${JSON.stringify(req.body, null, 2)}`
      );
      next();
    });

    // Setup Webhook route
    this.app.post(`/${this.WEBHOOK_PATH}`, webhookHandler(bot, "express"));

    // Start server
    const server = this.app.listen(this.PORT, () => {
      logger.info(`## Server listening on port ${this.PORT} [WEBHOOK MODE] ##`);
    });

    return server;
  }
}
