# Aztec Bot

- [Official Aztec Documentation](https://docs.aztec.network/)
- Here's a working version of the bot: [@AztecValidatorsBot](https://t.me/AztecValidatorsBot)

---

## Features

- Real-time stats on Aztec network, nodes, validators, epochs, etc.
- Telegram bot interface with command menu
- Secure API integration with proxy and rate limiting
- Redis caching for performance
- Role-based access and admin commands
- Dockerized for easy deployment
- Webhook and long polling support
- Logging with Pino
- Input validation with Zod schema validation

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Frameworks/Libraries:**
  - [gramio](https://gramio.dev/) (Telegram Bot)
  - [Express](https://expressjs.com/) (Webhook server)
  - [Axios](https://axios-http.com/) (HTTP client)
  - [ioredis](https://github.com/luin/ioredis) (Redis client)
  - [rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible)
  - [dotenv](https://github.com/motdotla/dotenv)
  - [pino](https://getpino.io/) (logging)
  - [https-proxy-agent](https://github.com/TooTallNate/node-https-proxy-agent)
  - [Zod](https://zod.dev/) (input validation)
- **Database/Cache:** Redis
- **Containerization:** Docker
- **CI/CD:** GitHub Actions

## Getting Started

### Prerequisites

- Node.js >= 18
- Redis server (local or Docker)
- Docker (optional, for containerized setup)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/miketester10/aztec-bot.git
   cd aztec-bot
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` in the project root and fill in the required values (see below).
   - **Important:** You must also create a `.env` file inside the `redis/` folder for the Redis Docker service. This file should contain at least the `REDIS_PASSWORD` variable (and any other Redis-specific settings you need).
4. **Start Redis:**
   - Locally: `docker-compose -f redis/docker-compose.yml up -d`
   - Or use your own Redis instance.
5. **Run the bot in development:**
   ```bash
   npm run dev
   ```
6. **Or run with Docker:**
   ```bash
   docker-compose up -d
   ```

### Environment Variables

Create a `.env` file in the project root with the following variables (example):

```
BOT_TOKEN=your_telegram_bot_token
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
SECRET_TOKEN=your_webhook_secret
WEBHOOK_URL=https://your-ngrok-or-domain-url
WEBHOOK_PATH=webhook
EXPRESS_PORT=3000
# ...other Aztec API endpoints
```

You must also create a `.env` file inside the `redis/` folder for the Redis Docker service. Example:

```
REDIS_PASSWORD=your_redis_password
```

### Main Scripts

- `npm run dev` — Start the bot in development mode (hot reload)
- `npm start` — Start the bot in production mode

### Docker

- `docker compose up -d` — Start bot and Redis in containers
- `docker compose down` — Stop and remove the containers

### Logging

The bot uses Pino for high-performance logging with the following configuration:

- **Console Output**: Colorized and formatted logs with timestamps using `pino-pretty`
- **File Logging**: Only error logs are saved to `logs/error.log` with the same formatting as console (without colors)
- **Automatic Directory Creation**: The `logs/` directory is created automatically if it doesn't exist
- **Log Levels**: Supports debug, info, warn, error, fatal, and trace levels

#### Log Format

**Console:**

```
[14-09-2025 02:23:15] INFO (201645): ✅ Webhook server ready on port 3000
[14-09-2025 02:23:15] ERROR (201645): ❌ Server failed to start: listen EADDRINUSE: address already in use :::3000
```

**File (`logs/error.log`):**

```
[14-09-2025 02:23:15] ERROR (201645): ❌ Server failed to start: listen EADDRINUSE: address already in use :::3000
```

#### Usage

```typescript
import { logger } from "./src/logger/logger";

logger.info("Application started");
logger.error("Something went wrong");
logger.debug("Debug information");
```

### Input Validation

The bot uses Zod for robust input validation to ensure data integrity and security:

- **Ethereum Address Validation**: Validates wallet addresses with format `0x` followed by 40 hexadecimal characters
- **Peer ID Validation**: Validates node peer IDs starting with `16Uiu2HA` and containing 53 Base58 characters

Validation schemas are defined in `src/schemas/inputValidatorSchemas.ts` and are automatically applied to user inputs for commands like `/node`, `/validator` and `/queue`.

### Webhook URL Generation

You can use the provided script `generate_ngrok_url.sh` to automatically start ngrok and update your `.env` file with the correct `WEBHOOK_URL` for local development:

```bash
./generate_ngrok_url.sh
```

This script will launch ngrok, fetch the public URL, and update your `.env` file accordingly.

### Project Structure

```
├── src/
│   ├── handlers/         # Business logic (commands, aztec, cache, proxy, server)
│   ├── interfaces/       # TypeScript interfaces
│   ├── types/            # Custom types
│   ├── consts/           # Constants (API endpoints)
│   ├── enums/            # Enums (cache keys, callback payloads, input types, etc.)
│   ├── schemas/          # Zod validation schemas
│   ├── logger/           # Logging setup with Pino
│   └── main.ts           # Entry point
├── logs/                 # Log files (auto-created)
│   └── error.log         # Error logs only
├── redis/                # Redis docker-compose config and .env
├── .github/              # CI/CD workflows
├── docker-compose.yml    # Docker config
├── package.json
├── tsconfig.json
├── generate_ngrok_url.sh    # Script to generate and set ngrok webhook URL
└── README.md
```

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---
