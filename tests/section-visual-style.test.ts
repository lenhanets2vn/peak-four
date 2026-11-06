import assert from 'node:assert/strict';
import test from 'node:test';
import { copySectionVisualStyle, pasteSectionVisualStyle } from '../src/utils/sectionVisualStyle';
import type { LandingPageSection } from '../src/types';

const base = (id:string,type:LandingPageSection['type']):LandingPageSection => ({id,type,title:id,subtitle:'',order:1,enabled:true});

test('paste style retains target content and moves section typography, motion and background', () => {
  const source = {...base('source','textMedia'), content:'Source content', design:{backgroundType:'solid' as const,backgroundColor:'#123456'}, typographySettings:{useGlobal:false,heading:{fontSize:32}}, motion:{mode:'custom' as const,effect:'fade' as const}, bgMode:'image' as const,bgImageUrl:'/old.jpg'};
  const target = {...base('target','textMedia'), content:'Target content', imageUrl:'/keep.jpg', title:'Keep title', design:{backgroundType:'solid' as const,backgroundColor:'#ffffff'}};
  const style = copySectionVisualStyle(source);
  const pasted = pasteSectionVisualStyle(target,style);
  assert.equal(pasted.content,'Target content');
  assert.equal(pasted.title,'Keep title');
  assert.equal(pasted.imageUrl,'/keep.jpg');
  assert.equal(pasted.design?.backgroundColor,'#123456');
  assert.equal(pasted.typographySettings?.heading?.fontSize,32);
  assert.equal(pasted.motion?.effect,'fade');
  assert.equal(pasted.bgImageUrl,'/old.jpg');
  source.design.backgroundColor='#999999';
  assert.equal(pasted.design?.backgroundColor,'#123456');
});

test('blog visual style leaves article, metadata, sidebar and CTA untouched', () => {
  const source = {...base('source','blogPost'),blog:{html:'<p>Source</p>',backgroundColor:'#eeeeee',sidebarBackgroundColor:'#dddddd',typography:{title:{fontSize:42}},ctaText:'Source CTA',sidebarItems:[{id:'s',title:'Source item'}]}} as LandingPageSection;
  const target = {...base('target','blogPost'),blog:{html:'<p>Target</p>',author:'Editor',ctaText:'Target CTA',sidebarItems:[{id:'t',title:'Target item'}]}} as LandingPageSection;
  const pasted = pasteSectionVisualStyle(target,copySectionVisualStyle(source));
  assert.equal(pasted.blog?.html,'<p>Target</p>');
  assert.equal(pasted.blog?.author,'Editor');
  assert.equal(pasted.blog?.ctaText,'Target CTA');
  assert.deepEqual(pasted.blog?.sidebarItems,target.blog?.sidebarItems);
  assert.equal(pasted.blog?.backgroundColor,'#eeeeee');
  assert.equal(pasted.blog?.typography?.title?.fontSize,42);
  const normal = pasteSectionVisualStyle(base('plain','textMedia'),copySectionVisualStyle(source));
  assert.equal(normal.blog,undefined);
});
