import { blockquote, Bot, code, format, link, MessageContext } from "gramio";
import { logger } from "./logger/logger";
import { ValidatorHandler } from "./validator-handler";

export class CommandsHandler {
  private static _instance: CommandsHandler;
  private readonly validatorHandler: ValidatorHandler =
    ValidatorHandler.getInstance();

  private constructor() {}

  static getInstance(): CommandsHandler {
    if (!CommandsHandler._instance) {
      CommandsHandler._instance = new CommandsHandler();
    }
    return CommandsHandler._instance;
  }

  async setCommands(bot: Bot): Promise<boolean> {
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
      return commands_set;
    } catch (error) {
      const unknownError = error as Error;
      logger.error(`Unknown Error while commands set: ${unknownError.message}`);
      return false;
    }
  }

  async handleValidatorCommand(ctx: MessageContext<Bot>): Promise<void> {
    await ctx.sendChatAction("typing");
    const address = ctx.update?.message?.text
      ?.split(" ")[1]
      ?.toLocaleLowerCase();
    if (!address) {
      const message = format`${code("Please enter a valid wallet address.")}`;
      await ctx.reply(message);
      return;
    }
    try {
      const result = await this.validatorHandler.getValidatorStats(address);
      const message =
        this.validatorHandler.createFormattedMessageForValidatorStats(result);
      await ctx.reply(message);
    } catch (error) {
      const messageError = format`${code(
        this.validatorHandler.handleError(error)
      )}`;
      await ctx.reply(messageError);
    }
  }

  async handleEpochCommand(ctx: MessageContext<Bot>): Promise<void> {
    await ctx.sendChatAction("typing");
    try {
      const result = await this.validatorHandler.getCurrentEpochStats();
      const message =
        this.validatorHandler.createFormattedMessageForEpochStats(result);
      await ctx.reply(message);
    } catch (error) {
      const messageError = format`${code(
        this.validatorHandler.handleError(error)
      )}`;
      await ctx.reply(messageError);
    }
  }

  async handleStartCommand(ctx: MessageContext<Bot>): Promise<void> {
    await ctx.sendChatAction("typing");
    const username = ctx.from?.firstName || ctx.from?.username || ctx.from?.id;

    const message = format`
Hi${username ? ` ${username}` : ""} 👋🏻
I am Aztec Bot 🤖

To receive validator stats, use:
${blockquote(code("/validator <wallet_address>"))}

To receive current epoch stats, use:
${blockquote(code("/epoch"))}

To display complete list of commands, use:
${blockquote(code("/help"))}

gAztec 💜

${blockquote(`⚠️ For more information contact the developer:
@vegeta (Discord)
@m1keehrmantraut (Telegram)`)}

🌐 ${link("X (Formerly Twitter)", "https://x.com/developervegeta")} | 👨🏻‍💻 ${link(
      "GitHub",
      "https://github.com/miketester10/"
    )}
`;

    await ctx.reply(message, {
      link_preview_options: { is_disabled: true },
    });
  }

  async handleHelpCommand(ctx: MessageContext<Bot>): Promise<void> {
    await ctx.sendChatAction("typing");
    await ctx.sendChatAction("typing");
    const message = format`
📚 List of Commands:

${blockquote(
  format`🔹${code("/validator <wallet_address>")} - to receive validator stats
🔹${code("/epoch")} - to receive current epoch stats
🔹${code("/start")} - to start the bot
🔹${code("/help")} - to receive this message
`
)}`;

    await ctx.reply(message);
  }
}
