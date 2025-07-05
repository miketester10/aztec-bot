import { Bot, CallbackQueryShorthandContext } from "gramio";

export interface CallbackRouter {
  [key: string]: CallbackHandler;
}

type CallbackHandler = (
  ctx: CallbackQueryShorthandContext<Bot, RegExp>,
  payload: string
) => Promise<void>;
