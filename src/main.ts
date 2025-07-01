import { Bot, MessageContext, webhookHandler } from "gramio";
import { ServerHandler } from "./server-handler";
import { CommandsHandler } from "./commands-handler";
import { logger } from "./logger/logger";
import { Server } from "http";
import { setupGracefulShutdown } from "./shutdown-handler";
import { config } from "dotenv";

config();

const NODE_ENV: string = process.env.NODE_ENV!;
const BOT_TOKEN: string = process.env.BOT_TOKEN!;
const SECRET_TOKEN: string = process.env.SECRET_TOKEN!;
const serverHandler: ServerHandler = ServerHandler.getInstance();
const commandsHandler: CommandsHandler = CommandsHandler.getInstance();

// Create bot and set commands
const bot = new Bot(BOT_TOKEN).onStart(async (ctx) => {
  if (!(await commandsHandler.setCommandsMenu(bot))) {
    logger.warn("**** Bot Started without set commands Menu ****");
    return;
  }
  logger.info("**** Bot Started ****");
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

if (NODE_ENV !== "production") {
  // Start bot with long polling
  bot.start();
} else {
  // Start server and bot with Webhook
  serverHandler
    .startServer(bot)
    .then((server: Server) => {
      bot.start({
        webhook: {
          url: `${serverHandler.WEBHOOK_URL}/${serverHandler.WEBHOOK_PATH}`,
          secret_token: serverHandler.SECRET_TOKEN,
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
}
