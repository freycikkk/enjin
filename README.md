# Enjin

An owner-only evaluation engine for Discord bots built with `discord.js`.

Enjin provides runtime debugging, command execution, and inspection tools for production bots.

## Features

- JavaScript evaluation
- Shell command execution (PowerShell, Bash, Zsh)
- HTTP requests (`curl`)
- File inspection (`cat`)
- Round-trip latency (`rtt`)
- Shard and cluster inspection
- Automatic pagination for long outputs
- Live-updating shell output
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
import { Client, GatewayIntentBits } from 'discord.js';
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
});

client.on('messageCreate', async (message) => {
  await enjin.run(message);
});

client.login('BOT_TOKEN');
```

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