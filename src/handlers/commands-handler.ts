import {
  blockquote,
  Bot,
  code,
  bold,
  format,
  link,
  MessageContext,
  TelegramInlineKeyboardButton,
  CallbackQueryShorthandContext,
} from "gramio";
import { logger } from "../logger/logger";
import { ValidatorHandler } from "./validator-handler";
import { CallbackRouter } from "../interfaces/callback-router.interface";
import { callbackPayload } from "../consts/callback-payload";

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

  async setCommandsMenu(bot: Bot): Promise<boolean> {
    try {
      const commands_set = await bot.api.setMyCommands({
        commands: [
          {
            command: "validator",
            description: "<wallet_address> - Validator stats",
          },
          {
            command: "top10",
            description: "Top 10 validators all time",
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

  async handleTop10Command(ctx: MessageContext<Bot>): Promise<void> {
    await ctx.sendChatAction("typing");
    try {
      const result = await this.validatorHandler.getTop10Validators();
      const message =
        this.validatorHandler.createFormattedMessageForTop10Validators(result);
      const inlineKeyboard: TelegramInlineKeyboardButton[][] = [
        [
          {
            text: "Rank score calculation Criteria",
            callback_data: "info:rank_score_criteria",
          },
        ],
      ];
      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });
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
I am ${bold("Aztec Bot 🤖")}

To receive validator stats, use:
${blockquote(code("/validator <wallet_address>"))}

To receive top 10 validators all time, use:
${blockquote(code("/top10"))}

To receive current epoch stats, use:
${blockquote(code("/epoch"))}

To display complete list of commands, use:
${blockquote(code("/help"))}

${bold("gAztec 💜")}

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
    const message = format`
  ${bold("📚 LIST OF COMMANDS 📚")}

${blockquote(
  format`🔹${code("/validator <wallet_address>")} - to receive validator stats
🔹${code("/top10")} - to receive top 10 validators all time
🔹${code("/epoch")} - to receive current epoch stats
🔹${code("/start")} - to start the bot
🔹${code("/help")} - to receive this message
`
)}`;

    await ctx.reply(message);
  }

  async handleCallbackCommand(
    ctx: CallbackQueryShorthandContext<Bot, RegExp>
  ): Promise<void> {
    const data = ctx.update?.callback_query?.data;
    logger.info(`Callback received with data: ${data}`);
    const [action, payload] = data?.split(":") || [];

    const callbackRouter = this.callbackRouter();
    const handler = callbackRouter[action];

    if (handler) {
      await handler(ctx, payload);
      return;
    }
    logger.error(`No handler found for action: ${action}`);
  }

  private callbackRouter(): CallbackRouter {
    const callbackRouter: CallbackRouter = {
      info: async (ctx, payload): Promise<void> => {
        let message;
        switch (payload) {
          case callbackPayload.RANK_SCORE_CRITERIA:
            message = `Rank are based on a score that considers the following metrics:
   
    - Attestation Success Rate (35%)
    - Attestation Volume (25%) 
    - Proposal Success Rate (20%)
    - Proposal Volume (20%)`;
            await ctx.answerCallbackQuery({ text: message, show_alert: true });
            break;
        }
      },
    };

    return callbackRouter;
  }
}
