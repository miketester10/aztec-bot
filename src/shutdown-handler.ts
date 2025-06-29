import { Bot } from "gramio";
import { logger } from "./logger/logger";
import { Server } from "http";

export function setupGracefulShutdown(bot: Bot, server: Server) {
  const handleShutdown = (signal: string) => {
    logger.info(`Received ${signal}. Shutting down bot and Express server...`);
    bot.stop();

    server.close(() => {
      logger.info("Express server closed");
      process.exit(0);
    });
  };

  process.once("SIGINT", () => handleShutdown("SIGINT"));
  process.once("SIGTERM", () => handleShutdown("SIGTERM"));
}
