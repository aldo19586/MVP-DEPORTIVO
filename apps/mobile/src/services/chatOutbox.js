import AsyncStorage from '@react-native-async-storage/async-storage';
import { createChatOutboxStore } from '../../../../shared/chatOutboxStore.mjs';

// Finish writes before a reopened screen reads its outbox. Keys isolate accounts and rooms.
export const chatOutbox = createChatOutboxStore(AsyncStorage);
