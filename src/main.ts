import { blockquote, bold, Bot, code, format, MessageContext } from "gramio";
import { ValidatorHandler } from "./shared";
import { config } from "dotenv";
import { help, start } from "./info";
import { logger } from "./logger/logger";
config();

const validatorHandler = ValidatorHandler.getInstance();
const TOKEN = process.env.BOT_TOKEN!;
const bot = new Bot(TOKEN).onStart(async (ctx) => {
  try {
    const commands_set = await bot.api.setMyCommands({
      commands: [
        {
          command: "validator",
          description: "<wallet_address> - Validator stats",
        },
        { command: "epoch", description: "Current epoch stats" },

        { command: "start", description: "Start the bot" },
        { command: "help", description: "Show list of available commands" },
      ],
    });
    if (!commands_set) {
      throw new Error("Error during commands set.");
    }
    logger.info("****Bot Started****");
  } catch (error) {
    const unknownError = error as Error;
    logger.error(`Unknown Error: ${unknownError.message}`);
  }
});
bot.start();

bot.command("validator", async (ctx: MessageContext<Bot>) => {
  await ctx.sendChatAction("typing");
  const address = ctx.update?.message?.text?.split(" ")[1]?.toLocaleLowerCase();
  if (!address) {
    const message = format`${code("Please enter a valid wallet address.")}`;
    await ctx.reply(message);
    return;
  }
  try {
    const result = await validatorHandler.getValidatorStats(address);
    const message = validatorHandler.createMessageForTelegram(result);
    await ctx.reply(message);
  } catch (error) {
    const messageError = format`${code(validatorHandler.handleError(error))}`;
    await ctx.reply(messageError);
  }
});

bot.command("epoch", async (ctx: MessageContext<Bot>) => {
  await ctx.sendChatAction("typing");
  const message = format`${code("To be implemented.")}`;
  await ctx.reply(message);
});
bot.command("start", async (ctx: MessageContext<Bot>) => await start(ctx));
bot.command("help", async (ctx: MessageContext<Bot>) => await help(ctx));

process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
