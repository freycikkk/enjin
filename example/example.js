import { Enjin } from "@freycikkk/enjin";
import { Client, Events, GatewayIntentBits } from "discord.js";

class Bot extends Client {
  enjin = new Enjin(this, {
    aliases: ["enjin", "eval"],
    owners: ["1156173961034465333"],
    prefix: ".",
    secrets: [process.env.API_KEY],
  });
  constructor() {
    super({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    });
    this.once(Events.ClientReady, async () => {
      console.log(`[${new Date().toLocaleTimeString("en-US")}] - Successfully logged in as ${this.user.username}`);
    });
    this.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;
      await this.enjin.run(message);
    });
  }
}

const client = new Bot();

client.login(process.env.BOT_TOKEN);
