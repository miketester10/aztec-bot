import pino from "pino";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

// Mi assicuro che la cartella logs esista altrimenti la creo
const logsDir = join(process.cwd(), "logs");
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Logger che scrive solo gli errori nei file con formattazione
const fileLogger = pino({
  level: "error", // Solo errori
  transport: {
    target: "pino-pretty",
    options: {
      translateTime: "SYS:dd-mm-yyyy HH:MM:ss",
      colorize: false, // Nessun colore nei file
      destination: join(logsDir, "error.log"), // Scrivi nel file
    },
  },
});

// Logger per console con pino-pretty
const consoleLogger = pino({
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      translateTime: "SYS:dd-mm-yyyy HH:MM:ss",
      colorize: true,
    },
  },
});

// Logger combinato che stampa tutto in console e salva solo gli errori nei file
class CombinedLogger {
  constructor(private readonly consoleLogger: pino.Logger, private readonly fileLogger: pino.Logger) {
    this.consoleLogger = consoleLogger;
    this.fileLogger = fileLogger;
  }

  debug(obj: any, msg?: string, ...args: any[]): void {
    this.consoleLogger.debug(obj, msg, ...args);
    // Solo console per debug
  }

  info(obj: any, msg?: string, ...args: any[]): void {
    this.consoleLogger.info(obj, msg, ...args);
    // Solo console per info
  }

  warn(obj: any, msg?: string, ...args: any[]): void {
    this.consoleLogger.warn(obj, msg, ...args);
    // Solo console per warn
  }

  error(obj: any, msg?: string, ...args: any[]): void {
    this.consoleLogger.error(obj, msg, ...args);
    this.fileLogger.error(obj, msg, ...args); // Solo errori nei file
  }

  fatal(obj: any, msg?: string, ...args: any[]): void {
    this.consoleLogger.fatal(obj, msg, ...args);
    this.fileLogger.fatal(obj, msg, ...args); // Solo fatal nei file
  }

  trace(obj: any, msg?: string, ...args: any[]): void {
    this.consoleLogger.trace(obj, msg, ...args);
    // Solo console per trace
  }
}

const logger = new CombinedLogger(consoleLogger, fileLogger);

export { logger };
