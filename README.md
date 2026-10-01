# Enjin

Enjin is an owner-only evaluation engine for Discord.js bots that provides a safe, production-ready way to inspect, debug, and execute commands at runtime without modifying your bot's source code.

## Features

- JavaScript evaluation
- Shell command execution (PowerShell, Bash, Zsh)
- HTTP requests (`curl`)
- File inspection (`cat`)
- Round-trip latency (`rtt`)
- Shard and cluster inspection
- Automatic pagination for long outputs, with controls that disable once they stop working
- Live-updating shell output
- Run commands from a replied message, or when a message is edited
- Automatic sharding detection
  - Native `discord.js`
  - `discord-hybrid-sharding`
  - Single process
- Secret value redaction

## Installation

```bash
npm install @freycikkk/enjin
```

## Usage

```js
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { Enjin } from '@freycikkk/enjin';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const enjin = new Enjin(client, {
  owners: ['YOUR_DISCORD_ID'],
  prefix: '!',
  aliases: ['enjin', 'debug'],
  secrets: ['SENSITIVE_VALUE'],
  react: true,        // set to false to disable reacting entirely
  reactEmoji: '✅',    // custom emoji used on a successful run
});

client.on(Events.MessageCreate, async (message) => {
  await enjin.run(message);
});

// Optional: also run commands that were edited into a message after the fact.
// Provide the old message as second argument.
client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  await enjin.run(newMessage, oldMessage);
});

client.login(process.env.BOT_TOKEN);
```

### Running a command on a replied message

If you trigger a command without inline input (or reply to a message) Enjin will fall back to the
content of the message you replied to. This lets you reply to a message containing a code block /
URL / file path and just run `!enjin js`, `!enjin curl`, etc. with no extra typing. Inline input, when
provided, always takes priority over the replied-to message.

### Reactions

By default Enjin reacts with ✅ once a command has been detected, the author authorized, and the
command finished running without throwing. Set `react: false` to disable this entirely, or
`reactEmoji` to use a different emoji.

## Command Format

```text
<prefix><alias> <engine> <input>
```

Example:

```text
!enjin js client.guilds.cache.size
!enjin shell ls -la
!enjin curl https://api.github.com
!enjin shard client.ws.ping
```

## Engines

| Engine | Description |
|--------|-------------|
| `js` | JavaScript evaluation |
| `iife` | JavaScript evaluation wrapped in its own async IIFE (supports top-level `return`/`await` and scoped declarations). A single expression (e.g. `client.guilds.cache.size`) is automatically returned even without `return`; multi-statement code still needs an explicit `return`. |
| `shell` | Shell execution |
| `curl` | HTTP requests |
| `cat` | File inspection |
| `rtt` | Round-trip latency |
| `shard` | Shard and cluster information |

## Security

- Owner-only execution
- No postinstall scripts
- Automatic secret redaction

## License

MIT