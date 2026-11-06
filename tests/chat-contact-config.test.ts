import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveChatSupportPhone } from '../src/utils/chatContact';

test('CMS chatbot number takes precedence over site footer', () => {
  const cms={aiChatbot:{supportPhone:'0901 234 567'},footer:{hotline:'1900 1234'},hotline:'1900 9999'} as any;
  assert.equal(resolveChatSupportPhone(cms),'0901 234 567');
});

test('footer is used only when chatbot phone is unconfigured', () => {
  assert.equal(resolveChatSupportPhone({aiChatbot:{supportPhone:''},footer:{hotline:'1900 1234'}} as any),'1900 1234');
});
