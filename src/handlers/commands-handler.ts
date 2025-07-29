import { blockquote, Bot, code, bold, italic, underline, format, link, TelegramInlineKeyboardButton, TelegramMessage, FormattableString, TelegramError } from "gramio";
import { MyMessageContext, MyCallbackQueryContext } from "../interfaces/custom-context.interface";
import { logger } from "../logger/logger";
import { AztecHandler } from "./aztec-handler";
import { CacheHandler } from "./cache-handler";
import { CallbackRouter } from "../interfaces/callback-router.interface";
import { CallbackPayload } from "../enums/callback-payload.enum";
import { CacheKeys } from "../enums/cache-keys.enum";
import { Input, InputType } from "../enums/input.enum";
import { inputValidatorSchemas } from "../schemas/inputValidatorSchemas";

export class CommandsHandler {
  private static _instance: CommandsHandler;
  private readonly aztecHandler: AztecHandler = AztecHandler.getInstance();
  private readonly cacheHandler: CacheHandler = CacheHandler.getInstance();

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
            command: "queue",
            description: "<wallet_address> - Validator queue position",
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
    try {
      await ctx.sendChatAction("typing");
      const result = await this.aztecHandler.getNetworkHealth();
      const message = this.aztecHandler.createFormattedMessageForNetworkHealth(result);
      await ctx.reply(message);
    } catch (error) {
      await this.handleError(error, ctx);
    }
  }

  async activeNodesByCountry(ctx: MyMessageContext): Promise<void> {
    try {
      await ctx.sendChatAction("typing");
      const result = await this.aztecHandler.getActiveNodesByCountry();
      const message = this.aztecHandler.createFormattedMessageForActiveNodesByCountry(result);
      await ctx.reply(message);
    } catch (error) {
      await this.handleError(error, ctx);
    }
  }

  async handleNodeCommand(ctx: MyMessageContext): Promise<void> {
    try {
      await ctx.sendChatAction("typing");
      const peerId = ctx.update?.message?.text?.trim().split(/\s+/)[1];
      if (!this.validateInput(peerId, Input.PEER_ID)) {
        const message = format`${code("Please enter a valid Peer ID.\n\nExample:\n/node 16Uiu2HAm2t758uSrVxEoPQPLQaWD6aNqWMTw32rKsRDQfoGTMWyP")}`;
        await ctx.reply(message);
        return;
      }

      const result = await this.aztecHandler.getNodeInfo(peerId);
      const message = this.aztecHandler.createFormattedMessageForNodeInfo(result);
      await ctx.reply(message);
    } catch (error) {
      await this.handleError(error, ctx);
    }
  }

  async handleValidatorCommand(ctx: MyMessageContext | MyCallbackQueryContext): Promise<void> {
    const isCallbackContext = this.isCallbackContext(ctx);
    let address: string | undefined;

    try {
      if (!isCallbackContext) {
        await ctx.sendChatAction("typing");
        address = ctx.update?.message?.text?.trim().split(/\s+/)[1]?.toLowerCase();
        if (!this.validateInput(address, Input.ETH_ADDRESS)) {
          const message = format`${code("Please enter a valid wallet address.\n\nExample:\n/validator 0x1234567890abcdef1234567890abcdef12345678")}`;
          await ctx.reply(message);
          return;
        }
        await this.cacheHandler.delete(`${CacheKeys.VALIDATOR_STATS}:${address}`);
      } else {
        address = (ctx.update?.callback_query?.message as TelegramMessage).reply_to_message?.text?.trim().split(/\s+/)[1]?.toLowerCase();
        if (!this.validateInput(address, Input.ETH_ADDRESS)) {
          throw new Error("Impossible to get address from callback query.");
        }
      }

      const result = await this.aztecHandler.getValidatorStats(address);
      const message = this.aztecHandler.createFormattedMessageForValidatorStats(result);

      const inlineKeyboard: TelegramInlineKeyboardButton[][] = [[{ text: "ℹ️ Ranking Criteria", callback_data: "info:rank_score_criteria:validator_stats" }]];

      const replyOptions = {
        reply_markup: { inline_keyboard: inlineKeyboard },
      };

      await this.replyOrEdit(ctx, message, replyOptions);
    } catch (error) {
      await this.handleError(error, ctx);
    }
  }

  async handleQueueCommand(ctx: MyMessageContext): Promise<void> {
    try {
      await ctx.sendChatAction("typing");
      const address = ctx.update?.message?.text?.trim().split(/\s+/)[1]?.toLowerCase();
      if (!this.validateInput(address, Input.ETH_ADDRESS)) {
        const message = format`${code("Please enter a valid wallet address.\n\nExample:\n/queue 0x1234567890abcdef1234567890abcdef12345678")}`;
        await ctx.reply(message);
        return;
      }

      const result = await this.aztecHandler.getValidatorInQueue(address);
      const message = this.aztecHandler.createFormattedMessageForValidatorInQueue(result);
      await ctx.reply(message);
    } catch (error) {
      await this.handleError(error, ctx);
    }
  }

  async handleTop10Command(ctx: MyMessageContext | MyCallbackQueryContext): Promise<void> {
    const isCallbackContext = this.isCallbackContext(ctx);

    try {
      if (!isCallbackContext) {
        await this.cacheHandler.delete(CacheKeys.TOP_10_VALIDATORS);
        await ctx.sendChatAction("typing");
      }

      const result = await this.aztecHandler.getTop10Validators();
      const message = this.aztecHandler.createFormattedMessageForTop10Validators(result);

      const inlineKeyboard: TelegramInlineKeyboardButton[][] = [[{ text: "ℹ️ Ranking Criteria", callback_data: "info:rank_score_criteria:top_10_validators" }]];

      const replyOptions = {
        reply_markup: { inline_keyboard: inlineKeyboard },
      };

      await this.replyOrEdit(ctx, message, replyOptions);
    } catch (error) {
      await this.handleError(error, ctx);
    }
  }

  async handleEpochCommand(ctx: MyMessageContext): Promise<void> {
    try {
      await ctx.sendChatAction("typing");
      const result = await this.aztecHandler.getCurrentEpochStats(ctx);
      const message = this.aztecHandler.createFormattedMessageForEpochStats(result);
      await ctx.reply(message);
    } catch (error) {
      await this.handleError(error, ctx);
    }
  }

  async handleStartCommand(ctx: MyMessageContext): Promise<void> {
    await ctx.sendChatAction("typing");
    const username = ctx.from?.firstName || ctx.from?.username || ctx.from?.id;

    const message = format`
Hi${username ? ` ${username}` : ""} 👋🏻
I am ${bold("Aztec Bot 🤖")}

To display complete list of commands, use:
${blockquote(code("/help"))}

${bold("gAztec 💜")}

${blockquote(`⚠️ For more information contact the developer:
@vegeta (Discord)
@m1keehrmantraut (Telegram)`)}

🌐 ${link("X (Formerly Twitter)", "https://x.com/developervegeta")} | 👨🏻‍💻 ${link("GitHub", "https://github.com/miketester10/")}
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
  format`🔹${code("/network_health")} - to receive network health info
🔹${code("/active_nodes")} - to receive active nodes info
🔹${code("/node <peer_id>")} - to receive node info
🔹${code("/validator <wallet_address>")} - to receive validator stats
🔹${code("/queue <wallet_address>")} - to receive validator queue position
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
    const [action, payload] = data?.split(":") || [];

    logger.debug("*".repeat(80));
    logger.warn(`Callback received with data: ${data}`);

    const callbackRouter = this.callbackRouter();
    const actionHandler = callbackRouter[action];

    if (actionHandler) {
      await actionHandler(ctx, payload);
      logger.debug(`Action [${action}] executed with payload: [${payload}]`);
    } else {
      logger.error(`No actionHandler found for: ${action}`);
    }
    logger.debug("*".repeat(80));

    // Stop animation of the button
    await ctx.answerCallbackQuery();
  }

  private callbackRouter(): CallbackRouter {
    const callbackRouter: CallbackRouter = {
      info: async (ctx, payload): Promise<void> => {
        let message;
        switch (payload) {
          case CallbackPayload.RANK_SCORE_CRITERIA:
            message = format`${blockquote(
              format`ℹ️ ${bold("RANKING SCORE CALCULATION")} ℹ️

              ${underline("Validators are ranked based on a weighted score (0-1) that considers the following metrics:")}

              ${italic("- Attestation Success Rate (35%)")}
              ${italic("- Attestation Volume (25%)")}
              ${italic("- Proposal Success Rate (20%)")}
              ${italic("- Proposal Volume (20%)")}`
            )}`;

            const backTarget = ctx.update?.callback_query?.data?.split(":")[2];
            const inlineKeyboard: TelegramInlineKeyboardButton[][] = [[{ text: "🔙 Back", callback_data: `back:${backTarget}` }]];

            const replyOptions = {
              reply_markup: { inline_keyboard: inlineKeyboard },
            };

            logger.debug(`Editing the message...`);

            await ctx.editText(message, replyOptions).then(() => {
              logger.debug("Message edited successfully.");
            });

            break;
        }
      },
      back: async (ctx, payload): Promise<void> => {
        switch (payload) {
          case CallbackPayload.TOP_10_VALIDATORS:
            logger.debug(`Editing the message...`);
            await this.handleTop10Command(ctx);
            break;

          case CallbackPayload.VALIDATOR_STATS:
            logger.debug(`Editing the message...`);
            await this.handleValidatorCommand(ctx);
            break;
        }
      },
    };

    return callbackRouter;
  }

  // If this method returns true, then input is valid and is of type string.
  private validateInput(input: string | undefined, validationType: InputType): input is string {
    const schema = inputValidatorSchemas[validationType];
    const validation = schema.safeParse(input);

    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => issue.message).join(", ");
      logger.error(`Validation failed for input ${validationType}: ${errors}`);
      return false;
    }

    return true;
  }

  // If this method returns true, then ctx is of type MyCallbackQueryContext.
  private isCallbackContext(ctx: MyMessageContext | MyCallbackQueryContext): ctx is MyCallbackQueryContext {
    return !("reply" in ctx); // .reply() method is only available in MyMessageContext
  }

  private async replyOrEdit(ctx: MyMessageContext | MyCallbackQueryContext, text: FormattableString, options?: Object): Promise<void> {
    if (this.isCallbackContext(ctx)) {
      await ctx.editText(text, options).then(() => {
        logger.debug("Message edited successfully.");
      });
    } else {
      await ctx.reply(text, options);
    }
  }

  private async handleError(error: unknown, ctx: MyMessageContext | MyCallbackQueryContext): Promise<void> {
    if (error instanceof TelegramError && error.message.includes("message is not modified")) {
      logger.error(`Telegram Error: ${error.message}`);
      return;
    }

    try {
      const errorMessage = format`${code(this.aztecHandler.handleError(error))}`;
      await this.replyOrEdit(ctx, errorMessage);
    } catch (e) {
      // Fallback if also replyOrEdit() fails
      logger.error(`Failed to send error message: ${(e as Error).message}`);
    }
  }
}
