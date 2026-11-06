import { ButtonDesignSettings, LandingPageConfig, LandingPageSection, SectionItem } from '../types';

function defaultButtonText(background?:string):string { const m=/^#([0-9a-f]{6})$/i.exec(background||'');if(!m)return '#ffffff';const rgb=[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)/255);const luminance=rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);return luminance>.34?'#0B0C0E':'#ffffff'; }

export function resolveButtonDesign(config:LandingPageConfig|null|undefined, design?:ButtonDesignSettings):ButtonDesignSettings {
  const global = config?.websiteSettings;
  const preset = design?.presetId ? global?.stylePresets?.find(p=>p.id===design.presetId&&p.target==='button')?.buttonDesign : undefined;
  const base:ButtonDesignSettings = {
    background: global?.colors.buttonPrimary || global?.colors.primary || '#0054a6',
    hoverBackground: global?.colors.buttonHover || global?.colors.secondary || '#003870',
    textColor:defaultButtonText(global?.colors.buttonPrimary||global?.colors.primary),hoverTextColor:defaultButtonText(global?.colors.buttonHover||global?.colors.secondary),borderColor:'transparent',hoverBorderColor:'transparent',borderWidth:0,borderRadius:12,shadow:'sm',width:'auto',paddingX:16,paddingY:10,
    fontSize:global?.typography.button.fontSize,fontWeight:global?.typography.button.fontWeight || 700,fontFamily:global?.typography.button.fontFamily,letterSpacing:global?.typography.button.letterSpacing,textTransform:'none',shape:'custom',
  };
  if(design?.useGlobal===false) return {...base,...preset,...design};
  return {...base,...preset,...design};
}

export function resolveSection(config:LandingPageConfig|null|undefined, section:LandingPageSection):LandingPageSection {
  const preset = section.design?.presetId ? config?.websiteSettings?.stylePresets?.find(p=>p.id===section.design?.presetId&&p.target==='section')?.sectionDesign : undefined;
  const globalBg = config?.websiteSettings?.colors.backgroundLight;
  const design = section.design?.useGlobal ? { backgroundType:'solid' as const, backgroundColor:globalBg, ...preset, ...section.design } : {...preset,...section.design};
  return {...section,design};
}

export function resolveCardStyle(config:LandingPageConfig|null|undefined,item:SectionItem):SectionItem['style']{
  const preset=item.style?.presetId?config?.websiteSettings?.stylePresets?.find(p=>p.id===item.style?.presetId&&p.target==='card')?.cardStyle:undefined;
  return {...preset,...item.style};
}

export function gradientString(g?:ButtonDesignSettings['gradient']){
  if(!g?.color1||!g?.color2)return undefined;if(g.type==='radial')return `radial-gradient(circle, ${g.color1}, ${g.color2})`;const angle=g.direction==='right-left'?270:g.direction==='top-bottom'?180:g.direction==='bottom-top'?0:g.direction==='custom'?(g.angle??90):90;return `linear-gradient(${angle}deg, ${g.color1}, ${g.color2})`;
}
