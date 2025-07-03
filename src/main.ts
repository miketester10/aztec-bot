import { Bot, MessageContext } from "gramio";
import { CommandsHandler } from "./handlers/commands-handler";
import { ServerHandler } from "./handlers/server-handler";
import { setupGracefulShutdown } from "./handlers/shutdown-handler";
import { logger } from "./logger/logger";
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
    logger.warn("⚠️ Bot Started without set commands Menu");
    return;
  }
  logger.info("✅ Bot Started");
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

const main = async () => {
  if (NODE_ENV !== "production") {
    // Start bot with long polling
    bot.start();
    return;
  }

  try {
    // Start server and bot with Webhook
    const server = await serverHandler.startServer(bot);
    bot.start({
      webhook: {
        url: `${serverHandler.WEBHOOK_URL}/${serverHandler.WEBHOOK_PATH}`,
        secret_token: serverHandler.SECRET_TOKEN,
      },
    });
    // Handle SIGINT and SIGTERM
    setupGracefulShutdown(bot, server);
  } catch (error) {
    logger.error(
      `Unknown Error while starting server: ${(error as Error).message}`
    );
  }
};
main();
