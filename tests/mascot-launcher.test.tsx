import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { AiChatbotWidget } from '../src/components/chat/AiChatbotWidget';
import { MASCOT_IDS, mascotBubbleStyle, mascotSheets } from '../src/utils/mascotCatalog';
import { normalizeAiChatbotConfig } from '../src/utils/aiConfigDefaults';

const root = new URL('../public/', import.meta.url);
test('every selectable mascot has the two sheets used by the launcher', () => {
  assert.equal(MASCOT_IDS.length,58);
  for (const id of MASCOT_IDS) {
    const sheets = mascotSheets(id);
    assert.ok(existsSync(new URL(`.${sheets.directions}`,root)),id);
    assert.ok(existsSync(new URL(`.${sheets.reactions}`,root)),id);
  }
  assert.equal(mascotSheets('../../x').directions,'/mascots/fox-directions.webp');
});

test('existing CMS config keeps icon launcher; selected mascot replaces launcher visual', () => {
  const old = renderToStaticMarkup(<AiChatbotWidget config={normalizeAiChatbotConfig({launcherText:'Tư vấn'})}/>);
  assert.match(old,/Tư vấn/);
  assert.doesNotMatch(old,/mascots\/fox-directions/);
  const mascot = renderToStaticMarkup(<AiChatbotWidget config={normalizeAiChatbotConfig({launcherVisual:'mascot',mascotId:'otter',launcherText:'Tư vấn'})}/>);
  assert.match(mascot,/mascots\/otter-directions\.webp/);
  assert.match(mascot,/mascots\/otter-reactions\.webp/);
  assert.match(mascot,/aria-label="Trợ lý AI Bảo Việt"/);
  assert.match(mascot,/Tư vấn/);
  assert.match(mascot,/background-color:rgba\(255, 255, 255, 0\)/);
  assert.match(mascot,/box-shadow:none/);
});

test('CMS mascot bubble opacity and color control the launcher background', () => {
  assert.equal(mascotBubbleStyle({mascotBubbleColor:'#005baa',mascotBubbleOpacity:50}).backgroundColor,'rgba(0, 91, 170, 0.5)');
  assert.equal(mascotBubbleStyle({mascotBubbleColor:'#ff0000',mascotBubbleOpacity:100}).backgroundColor,'rgba(255, 0, 0, 1)');
  assert.equal(mascotBubbleStyle({mascotBubbleOpacity:0}).borderColor,'transparent');
});
