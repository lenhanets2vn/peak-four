import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { FONT_PRESETS, loadAllConfigFonts, loadGoogleFont } from '../src/utils/fontPresets';
import { BlogPostEditor } from '../src/components/admin/BlogPostEditor';

test('bank style fonts are available in the shared picker and blog editor', () => {
  for(const name of ['Manrope','DM Sans','Noto Sans Display','IBM Plex Sans','Source Sans 3','Roboto Condensed']) {
    assert.ok(FONT_PRESETS.some(font=>font.name===name&&font.vietnameseReady),name);
  }
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.test/'});
  (globalThis as any).window=dom.window;(globalThis as any).document=dom.window.document;
  const markup=renderToStaticMarkup(<BlogPostEditor section={{id:'blog',type:'blogPost',title:'Tin tức',subtitle:'',order:1,enabled:true,blog:{html:''}} as any} onChange={()=>{}}/>);
  assert.match(markup,/<option value="Manrope">Manrope<\/option>/);
  assert.match(markup,/Font chữ cho vùng này/);
  dom.window.close();
});

test('published category and utility fonts request the selected weights once', () => {
  const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://example.test/'});
  (globalThis as any).window=dom.window;(globalThis as any).document=dom.window.document;
  loadAllConfigFonts({websiteSettings:{navigation:{fontFamily:"'Manrope', sans-serif"},header:{utilityFontFamily:"'DM Sans', sans-serif"}}});
  assert.match(dom.window.document.getElementById('gf-manrope')?.getAttribute('href')||'',/family=Manrope:wght@300;400;500;600;700;800/);
  assert.match(dom.window.document.getElementById('gf-dm-sans')?.getAttribute('href')||'',/family=DM\+Sans:wght@300;400;500;600;700;800/);
  loadGoogleFont("'Manrope', sans-serif");
  assert.equal(dom.window.document.querySelectorAll('#gf-manrope').length,1);
  dom.window.close();
});
