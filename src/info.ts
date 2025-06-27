import { MessageContext, Bot, format, code, link, blockquote } from "gramio";

const start = async (ctx: MessageContext<Bot>): Promise<void> => {
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
};

const help = async (ctx: MessageContext<Bot>): Promise<void> => {
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
};
export { start, help };
