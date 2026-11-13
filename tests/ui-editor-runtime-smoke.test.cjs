// Dependency-free smoke for the exact editor that crashed with "a is not defined".
// Uses TypeScript's compiler (if available globally) and fake JSX, NOT an E2E browser test.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
let ts; try { ts=require('typescript'); } catch { ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
const root=path.resolve(__dirname,'..');
const react={useId:()=> 'ui-smoke',useState:(value)=>[typeof value==='function'?value():value,()=>{}],useEffect:()=>{},createElement:(type,props,...children)=>({type,props:{...props,children}})};
const jsx=(type,props)=>({type,props:props||{}});
const req=name=>{
 if(name==='react')return {__esModule:true,default:react,...react};
 if(name==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'fragment'};
 if(name.includes('services/api'))return {getPages:async()=>[]};
 if(name.includes('heritageDesign'))return {heritageButton:{}};
 if(name.includes('FontSelector'))return {FontSelector:()=>null};
 return {};
};
const source=fs.readFileSync(path.join(root,'src/components/admin/SettingsEditors.tsx'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const moduleExports={};vm.runInNewContext(js,{require:req,exports:moduleExports,console,Date,Promise,RegExp},{timeout:2000});
const config={sections:[{id:'abc',title:'Quyền lợi',anchorId:'benefits'}],websiteSettings:{popups:[],forms:[],navigation:{items:[]}}};
function treeContains(node, pred){
 if(Array.isArray(node))return node.some(child=>treeContains(child,pred));
 if(!node||typeof node!=='object')return false;
 if(pred(node))return true;
 const children=node.props?.children;
 return (Array.isArray(children)?children:[children]).some(child=>treeContains(child,pred));
}
test('Legacy CTA editor renders section mode without undeclared variable',()=>{
 const tree=moduleExports.LegacyDestinationEditor({config,value:'#lead-form-section',onChange:()=>{}});
 assert.ok(treeContains(tree,n=>n.type==='option'&&n.props.value==='lead-form-section'));
});
test('Generic CTA editor renders URL, category, section without runtime ReferenceError',()=>{
 for(const type of ['url','internal','scroll']){
  const tree=moduleExports.ActionEditor({config,value:{type,target:type==='scroll'?'benefits':'/'},onChange:()=>{}});
  assert.ok(tree);
  if(type==='scroll')assert.ok(treeContains(tree,n=>n.type==='option'&&n.props.value==='benefits'));
 }
});
