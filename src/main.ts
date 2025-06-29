import { Bot, MessageContext, webhookHandler } from "gramio";
import { ServerHandler } from "./server-handler";
import { CommandsHandler } from "./commands-handler";
import { logger } from "./logger/logger";
import { Server } from "http";
import { setupGracefulShutdown } from "./shutdown-handler";
import { config } from "dotenv";

config();

const BOT_TOKEN = process.env.BOT_TOKEN!;
const serverHandler = ServerHandler.getInstance();
const commandsHandler = CommandsHandler.getInstance();

// Create bot and set commands
const bot = new Bot(BOT_TOKEN).onStart(async (ctx) => {
  if (await commandsHandler.setCommands(bot)) {
    logger.info("**** Bot Started ****");
    return
  }
  logger.info("**** Bot Started without set commands ****");
});
bot.command("validator", async (ctx: MessageContext<Bot>) => {
  await commandsHandler.handleValidatorCommand(ctx);
});
bot.command("epoch", async (ctx: MessageContext<Bot>) => {
  await commandsHandler.handleEpochCommand(ctx);
});
bot.command("start", async (ctx: MessageContext<Bot>) => {
  await commandsHandler.handleStartCommand(ctx);
});
bot.command("help", async (ctx: MessageContext<Bot>) => {
  await commandsHandler.handleHelpCommand(ctx);
});

// Start server and bot
serverHandler
  .startServer(bot)
  .then((server: Server) => {
    bot.start({
      webhook: {
        url: `${serverHandler.WEBHOOK_URL}/${serverHandler.WEBHOOK_PATH}`,
      },
    });
    // Handle SIGINT and SIGTERM
    setupGracefulShutdown(bot, server);
  })
  .catch((error) => {
    const unknownError = error as Error;
    logger.error(
      `Unknown Error while starting server: ${unknownError.message}`
    );
  });
