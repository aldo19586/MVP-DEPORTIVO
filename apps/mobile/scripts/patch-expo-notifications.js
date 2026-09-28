const fs = require('fs');
const path = require('path');

// 1. Parche para warnOfExpoGoPushUsage.js (evitar throw new Error en Android)
const warnFile = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'warnOfExpoGoPushUsage.js');
if (fs.existsSync(warnFile)) {
  let content = fs.readFileSync(warnFile, 'utf8');
  if (content.includes("throw new Error(message)")) {
    content = content.replace(
      /if \(Platform\.OS === 'android'\) \{\s*throw new Error\(message\);\s*\}\s*else if \(__DEV__\) \{\s*didWarn = true;\s*console\.warn\(message\);\s*\}/,
      `didWarn = true;\n        console.warn(message);`
    );
    fs.writeFileSync(warnFile, content, 'utf8');
    console.log('[PATCH] warnOfExpoGoPushUsage patched successfully!');
  }
}

// 2. Parche para TopicSubscriptionModule.android.js (evitar Cannot find native module 'ExpoTopicSubscriptionModule')
const topicFile = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'TopicSubscriptionModule.android.js');
if (fs.existsSync(topicFile)) {
  const safeContent = `import { requireOptionalNativeModule } from 'expo-modules-core';

let nativeModule = null;
try {
  nativeModule = requireOptionalNativeModule('ExpoTopicSubscriptionModule');
} catch (e) {
  nativeModule = null;
}

const fallbackModule = {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: async () => null,
  unsubscribeFromTopicAsync: async () => null,
};

export default nativeModule || fallbackModule;
`;
  fs.writeFileSync(topicFile, safeContent, 'utf8');
  console.log('[PATCH] TopicSubscriptionModule.android patched successfully!');
}
