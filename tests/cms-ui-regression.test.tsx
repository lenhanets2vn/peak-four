import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminLogin } from '../src/components/admin/AdminLogin';
import { AiChatbotWidget } from '../src/components/chat/AiChatbotWidget';
import { chatbotMascotSize, chatbotSideMargin } from '../src/utils/chatbotLauncherStyle';
import { defaultAdminLoginSettings } from '../src/data/defaultConfig';

test('CMS login removes bypass divider when quick access is disabled', () => {
  const disabled = renderToStaticMarkup(<AdminLogin settings={{...defaultAdminLoginSettings,showQuickAdmin:false}} onSuccess={() => {}} onBackToLanding={() => {}} />);
  assert.doesNotMatch(disabled, /hoặc tài khoản CMS|Admin Bypass/);
  assert.match(disabled, /<form/);
  const enabled = renderToStaticMarkup(<AdminLogin settings={{...defaultAdminLoginSettings,showQuickAdmin:true}} onSuccess={() => {}} onBackToLanding={() => {}} />);
  assert.match(enabled, /hoặc tài khoản CMS/);
});

test('mascot grows to CMS maximum, stays inside page edge, and uses chosen badge shadow', () => {
  const config = {enabled:true,launcherVisual:'mascot',mascotSize:180,floatingPosition:'bottom-left',floatingMarginSide:1,floatingBadgeTextShadowColor:'#8a3cbb',floatingBadgeText:'Mời tư vấn'} as const;
  const markup = renderToStaticMarkup(<AiChatbotWidget config={config as any} />);
  assert.equal(chatbotMascotSize(config as any), 180);
  assert.equal(chatbotSideMargin(config as any), 40);
  assert.match(markup, /left:calc\(40px \+ env\(safe-area-inset-left, 0px\)\)/);
  assert.match(markup, /width:180px/);
  assert.match(markup, /0 1px 2px #8a3cbb, 0 2px 7px #8a3cbb/);
  assert.match(markup, /Mời tư vấn/);
});

test('chatbot keeps the same edge spacing on the right and clamps oversized CMS values', () => {
  const config = {enabled:true,launcherVisual:'mascot',mascotSize:999,floatingPosition:'bottom-right',floatingMarginSide:999} as const;
  const markup = renderToStaticMarkup(<AiChatbotWidget config={config as any} />);
  assert.equal(chatbotMascotSize(config as any), 180);
  assert.equal(chatbotSideMargin(config as any), 160);
  assert.match(markup, /right:calc\(160px \+ env\(safe-area-inset-right, 0px\)\)/);
});
