import test from 'node:test';
import assert from 'node:assert/strict';
import { callGeminiModelWithResilience } from '../src/services/geminiServer';

test('configured 2.5 Flash-Lite model is called without a hard-coded replacement', async () => {
  const called:string[]=[];
  const result=await callGeminiModelWithResilience({} as any,['gemini-2.5-flash-lite'],async model=>{
    called.push(model);return {text:'OK'};
  });
  assert.equal(result.modelUsed,'gemini-2.5-flash-lite');
  assert.deepEqual(called,['gemini-2.5-flash-lite']);
});

test('CMS primary model can be changed without a release', async () => {
  const called:string[]=[];
  const selected='gemini-3.5-flash-lite';
  const result=await callGeminiModelWithResilience({} as any,[selected],async model=>{
    called.push(model);return {text:'OK'};
  });
  assert.equal(result.modelUsed,selected);
  assert.deepEqual(called,[selected]);
});
