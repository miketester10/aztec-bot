import {
  blockquote,
  Bot,
  code,
  bold,
  italic,
  underline,
  format,
  link,
  TelegramInlineKeyboardButton,
} from "gramio";
import {
  MyMessageContext,
  MyCallbackQueryContext,
} from "../interfaces/custom-context.interface";
import { logger } from "../logger/logger";
import { AztecHandler } from "./aztec-handler";
import { CallbackRouter } from "../interfaces/callback-router.interface";
import { callbackPayload } from "../consts/callback-payload";

export class CommandsHandler {
  private static _instance: CommandsHandler;
  private readonly aztecHandler: AztecHandler = AztecHandler.getInstance();

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
            command: "network_health",
            description: "Network health info",
          },
          {
            command: "active_nodes",
            description: "Active nodes info",
          },
          {
            command: "node",
            description: "<peer_id> - Node info",
          },
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

  async newtworkHealth(ctx: MyMessageContext): Promise<void> {
    await ctx.sendChatAction("typing");
    try {
      const result = await this.aztecHandler.getNetworkHealth();
      const message =
        this.aztecHandler.createFormattedMessageForNetworkHealth(result);
      await ctx.reply(message);
    } catch (error) {
      const messageError = format`${code(
        this.aztecHandler.handleError(error)
      )}`;
      await ctx.reply(messageError);
    }
  }

  async activeNodesByCountry(ctx: MyMessageContext): Promise<void> {
    await ctx.sendChatAction("typing");
    try {
      const result = await this.aztecHandler.getActiveNodesByCountry();
      const message =
        this.aztecHandler.createFormattedMessageForActiveNodesByCountry(result);
      await ctx.reply(message);
    } catch (error) {
      const messageError = format`${code(
        this.aztecHandler.handleError(error)
      )}`;
      await ctx.reply(messageError);
    }
  }

  async handleNodeCommand(ctx: MyMessageContext): Promise<void> {
    await ctx.sendChatAction("typing");
    const peerId = ctx.update?.message?.text?.split(" ")[1];
    if (!peerId) {
      const message = format`${code("Please enter a valid Peer ID.")}`;
      await ctx.reply(message);
      return;
    }
    try {
      const result = await this.aztecHandler.getNodeInfo(peerId);
      const message =
        this.aztecHandler.createFormattedMessageForNodeInfo(result);
      await ctx.reply(message);
    } catch (error) {
      const messageError = format`${code(
        this.aztecHandler.handleError(error)
      )}`;
      await ctx.reply(messageError);
    }
  }

  async handleValidatorCommand(ctx: MyMessageContext): Promise<void> {
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
      const result = await this.aztecHandler.getValidatorStats(address);
      const message =
        this.aztecHandler.createFormattedMessageForValidatorStats(result);
      await ctx.reply(message);
    } catch (error) {
      const messageError = format`${code(
        this.aztecHandler.handleError(error)
      )}`;
      await ctx.reply(messageError);
    }
  }

  async handleTop10Command(
    ctx: MyMessageContext | MyCallbackQueryContext
  ): Promise<void> {
    const isCallbackContext = this.isCallbackContext(ctx);
    if (!isCallbackContext) await ctx.sendChatAction("typing");
    const inlineKeyboard: TelegramInlineKeyboardButton[][] = [
      [
        {
          text: "ℹ️ Criteria",
          callback_data: "info:rank_score_criteria",
        },
      ],
    ];
    try {
      const result = await this.aztecHandler.getTop10Validators();
      const message =
        this.aztecHandler.createFormattedMessageForTop10Validators(result);

      if (isCallbackContext) {
        await ctx.editText(message, {
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        });
        return;
      }

      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });
    } catch (error) {
      const messageError = format`${code(
        this.aztecHandler.handleError(error)
      )}`;
      if (isCallbackContext) {
        await ctx.editText(messageError);
        return;
      }

      await ctx.reply(messageError);
    }
  }

  async handleEpochCommand(ctx: MyMessageContext): Promise<void> {
    await ctx.sendChatAction("typing");
    try {
      const result = await this.aztecHandler.getCurrentEpochStats();
      const message =
        this.aztecHandler.createFormattedMessageForEpochStats(result);
      await ctx.reply(message);
    } catch (error) {
      const messageError = format`${code(
        this.aztecHandler.handleError(error)
      )}`;
      await ctx.reply(messageError);
    }
  }

  async handleStartCommand(ctx: MyMessageContext): Promise<void> {
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

  async handleHelpCommand(ctx: MyMessageContext): Promise<void> {
    await ctx.sendChatAction("typing");
    const message = format`
  ${bold("📚 LIST OF COMMANDS 📚")}

${blockquote(
  format`🔹${code("/network_healt")} - to receive network healt info
🔹${code("/active_nodes")} - to receive active nodes info
🔹${code("/node <peer_id>")} - to receive node info
🔹${code("/validator <wallet_address>")} - to receive validator stats
🔹${code("/top10")} - to receive top 10 validators all time
🔹${code("/epoch")} - to receive current epoch stats
🔹${code("/start")} - to start the bot
🔹${code("/help")} - to receive this message
`
)}`;

    await ctx.reply(message);
  }

  async handleCallbackCommand(ctx: MyCallbackQueryContext): Promise<void> {
    const data = ctx.update?.callback_query?.data;
    logger.warn(`Callback received with data: ${data}`);
    const [action, payload] = data?.split(":") || [];

    const callbackRouter = this.callbackRouter();
    const actionHandler = callbackRouter[action];

    if (actionHandler) {
      await actionHandler(ctx, payload);
      logger.debug(`Action [${action}] executed with payload: [${payload}]`);
      return;
    }
    logger.error(`No actionHandler found for: ${action}`);
  }

  private callbackRouter(): CallbackRouter {
    const callbackRouter: CallbackRouter = {
      info: async (ctx, payload): Promise<void> => {
        let message;
        switch (payload) {
          case callbackPayload.RANK_SCORE_CRITERIA:
            message = format`${blockquote(
              format`ℹ️ ${bold("RANKING SCORE CALCULATION")} ℹ️

              ${underline(
                "Validators are ranked based on a weighted score (0-1) that considers the following metrics:"
              )}

              ${italic("- Attestation Success Rate (35%)")}
              ${italic("- Attestation Volume (25%)")}
              ${italic("- Proposal Success Rate (20%)")}
              ${italic("- Proposal Volume (20%)")}`
            )}`;
            // await ctx.answerCallbackQuery({ text: message, show_alert: true });
            const inlineKeyboard: TelegramInlineKeyboardButton[][] = [
              [
                {
                  text: "🔙 Back",
                  callback_data: "back:top_10_validators",
                },
              ],
            ];
            logger.debug(`Editing the message...`);
            await ctx.editText(message, {
              reply_markup: {
                inline_keyboard: inlineKeyboard,
              },
            });
            break;
        }
      },
      back: async (ctx, payload): Promise<void> => {
        switch (payload) {
          case callbackPayload.TOP_10_VALIDATORS:
            logger.debug(`Editing the message...`);
            await this.handleTop10Command(ctx);
            break;
        }
      },
    };

    return callbackRouter;
  }

  // If this method returns true, then ctx is of type MyCallbackQueryContext.
  private isCallbackContext(
    ctx: MyMessageContext | MyCallbackQueryContext
  ): ctx is MyCallbackQueryContext {
    return !("reply" in ctx); // .reply() method is only available in MyMessageContext
  }
}
