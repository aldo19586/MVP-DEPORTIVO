import { EventEmitter } from 'node:events';

// In-process notification after the persistent session version has changed.
export const sessionEvents = new EventEmitter();
