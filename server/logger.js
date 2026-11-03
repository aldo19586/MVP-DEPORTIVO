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

// Formato personalizado para archivo y consola
const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
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
