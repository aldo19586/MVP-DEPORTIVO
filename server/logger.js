import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { runtimeConfig } from './config.js';

// Los logs de pruebas quedan junto a su base aislada.
const logsDir = runtimeConfig.logDir;
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFilePath = path.join(logsDir, 'matchmaking.log');

// Patrones para redactar automáticamente credenciales sensibles en logs
const SENSITIVE_PATTERN = /("(?:password|pin|newPin|pinHash|token|secret|pushToken)"\s*:\s*)"[^"]+"/gi;
const BEARER_PATTERN = /(Bearer\s+)[A-Za-z0-9._-]+/gi;

export function sanitizeLogText(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(SENSITIVE_PATTERN, '$1"[REDACTED]"')
    .replace(BEARER_PATTERN, '$1[REDACTED]');
}

const sanitizeFormat = winston.format((info) => {
  if (typeof info.message === 'string') {
    info.message = sanitizeLogText(info.message);
  }
  for (const key of Object.keys(info)) {
    if (typeof info[key] === 'string' && key !== 'level' && key !== 'timestamp') {
      info[key] = sanitizeLogText(info[key]);
    }
  }
  return info;
});

// Formato personalizado para archivo y consola
const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    sanitizeFormat(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [
    // Archivo logs/matchmaking.log
    new winston.transports.File({
      filename: logFilePath,
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 3
    }),
    // Consola
    new winston.transports.Console({
      format: winston.format.combine(
        sanitizeFormat(),
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      )
    })
  ]
});

export default logger;
