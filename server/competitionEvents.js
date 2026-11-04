import { EventEmitter } from 'node:events';

// Publish only after durable commits. These events are hints; REST remains authoritative.
export const competitionEvents = new EventEmitter();
