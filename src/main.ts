import { Bot, MessageContext } from "gramio";
import { CommandsHandler } from "./handlers/commands-handler";
import { ServerHandler } from "./handlers/server-handler";
import { logger } from "./logger/logger";
import { config } from "dotenv";

config();

const NODE_ENV: string = process.env.NODE_ENV!;
const BOT_TOKEN: string = process.env.BOT_TOKEN!;
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
// Handle Commands
bot.command("validator", async (ctx: MessageContext<Bot>) => {
  await commandsHandler.handleValidatorCommand(ctx);
});
bot.command("top10", async (ctx: MessageContext<Bot>) => {
  await commandsHandler.handleTop10Command(ctx);
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
// Handle Callback
bot.callbackQuery<RegExp>(/^.+$/, async (ctx) => {
  await commandsHandler.handleCallbackCommand(ctx);
});

const main = async () => {
  try {
    if (NODE_ENV !== "production") {
      // Start bot with long polling
      await bot.start();
      return;
    }
    // Start server and bot with Webhook
    await serverHandler.startServer(bot);
    await bot.start({
      webhook: {
        url: `${serverHandler.WEBHOOK_URL}/${serverHandler.WEBHOOK_PATH}`,
        secret_token: serverHandler.SECRET_TOKEN,
      },
    });
  } catch (error) {
    logger.error(
      `Unknown Error while starting bot or server: ${(error as Error).message}`
    );
  }
};
main();
