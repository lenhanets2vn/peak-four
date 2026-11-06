const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const widget = fs.readFileSync('src/components/chat/AiChatbotWidget.tsx','utf8');
const server = fs.readFileSync('server.ts','utf8');
const orchestrator = fs.readFileSync('src/services/chatbotConversationOrchestrator.ts','utf8');

test('chat header exposes an explicit product switch control', () => {
  assert.match(widget, /Đổi sản phẩm/);
  assert.match(widget, /productSwitcherOpen/);
  assert.match(widget, /selectedProductId:\s*options\?\.selectedProductId/);
});

test('product switch is deterministic and validated against taxonomy', () => {
  assert.match(server, /selectedProductId/);
  assert.match(orchestrator, /forcedProductId/);
  assert.match(orchestrator, /products\.find\(\(p\) => p\.id === forcedProductId\)/);
  assert.match(orchestrator, /router\.conversationMode\s*=.*'SWITCH'/);
  assert.match(orchestrator, /router\.component = null/);
});
