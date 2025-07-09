import { Bot } from "gramio";
import {
  MyMessageContext,
  MyCallbackQueryContext,
} from "./interfaces/custom-context.interface";
import { CommandsHandler } from "./handlers/commands-handler";
import { ServerHandler } from "./handlers/server-handler";
import { logger } from "./logger/logger";
import { config } from "dotenv";

config();

const NODE_ENV: string = process.env.NODE_ENV!;
const BOT_TOKEN: string = process.env.BOT_TOKEN!;
const BLOCKED_USER_IDS = [5645790791, 72274003];
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
bot.command("network_health", async (ctx: MyMessageContext) => {
  if (await isSpam(ctx)) return;
  await commandsHandler.newtworkHealth(ctx);
});
bot.command("active_nodes", async (ctx: MyMessageContext) => {
  if (await isSpam(ctx)) return;
  await commandsHandler.activeNodesByCountry(ctx);
});
bot.command("node", async (ctx: MyMessageContext) => {
  if (await isSpam(ctx)) return;
  await commandsHandler.handleNodeCommand(ctx);
});
bot.command("validator", async (ctx: MyMessageContext) => {
  if (await isSpam(ctx)) return;
  await commandsHandler.handleValidatorCommand(ctx);
});
bot.command("top10", async (ctx: MyMessageContext) => {
  if (await isSpam(ctx)) return;
  await commandsHandler.handleTop10Command(ctx);
});
bot.command("epoch", async (ctx: MyMessageContext) => {
  if (await isSpam(ctx)) return;
  await commandsHandler.handleEpochCommand(ctx);
});
bot.command("start", async (ctx: MyMessageContext) => {
  if (await isSpam(ctx)) return;
  await commandsHandler.handleStartCommand(ctx);
});
bot.command("help", async (ctx: MyMessageContext) => {
  if (await isSpam(ctx)) return;
  await commandsHandler.handleHelpCommand(ctx);
});
// Handle Callback
bot.callbackQuery<RegExp>(/^.+$/, async (ctx: MyCallbackQueryContext) => {
  if (await isSpam(ctx)) return;
  await commandsHandler.handleCallbackCommand(ctx);
});

const isSpam = async (
  ctx: MyMessageContext | MyCallbackQueryContext
): Promise<boolean> => {
  const userId = ctx.from?.id;
  if (userId && BLOCKED_USER_IDS.includes(userId)) {
    await ctx.send("Too many requests, please DO NOT SPAM!");
    return true;
  }
  return false;
};

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
