import type { ButtonDesignSettings, FooterConfig, GlobalColorSettings, GlobalTypographySettings, HeaderSettings, LandingPageSection, NavigationSettings } from '../types';

/** Reusable design values observed on the public reference site. No copy or media assets are bundled. */
export const heritageColors:GlobalColorSettings={primary:'#C5A880',secondary:'#14161B',goldAccent:'#C5A880',backgroundLight:'#F9F8F5',backgroundDark:'#0B0C0E',textPrimary:'#121316',textSecondary:'#5C5B57',buttonPrimary:'#C5A880',buttonHover:'#D5BA91',border:'#E6E2DA'};
export const heritageTypography:GlobalTypographySettings={
 h1:{fontFamily:"'Cormorant Garamond', Georgia, serif",fontSize:76,tabletSize:62,mobileSize:44,fontWeight:400,lineHeight:1,letterSpacing:-1.8,color:'#121316'},
 h2:{fontFamily:"'Cormorant Garamond', Georgia, serif",fontSize:56,tabletSize:48,mobileSize:38,fontWeight:400,lineHeight:1.06,letterSpacing:-1.3,color:'#121316'},
 h3:{fontFamily:"'Cormorant Garamond', Georgia, serif",fontSize:28,tabletSize:26,mobileSize:24,fontWeight:400,lineHeight:1.2,color:'#121316'},
 h4:{fontFamily:"'Cormorant Garamond', Georgia, serif",fontSize:22,fontWeight:400,lineHeight:1.25,color:'#121316'},
 body:{fontFamily:"'Plus Jakarta Sans', sans-serif",fontSize:16,fontWeight:300,lineHeight:1.75,color:'#5C5B57'},
 caption:{fontFamily:"'JetBrains Mono', monospace",fontSize:12,fontWeight:600,lineHeight:1.5,letterSpacing:1.8,color:'#8E8B82'},
 button:{fontFamily:"'Plus Jakarta Sans', sans-serif",fontSize:12,fontWeight:600,lineHeight:1.3,letterSpacing:1.5,color:'#121316'},
};
export const heritageButton:ButtonDesignSettings={useGlobal:false,background:'#C5A880',hoverBackground:'#D5BA91',textColor:'#0B0C0E',hoverTextColor:'#0B0C0E',borderColor:'#C5A880',hoverBorderColor:'#D5BA91',borderWidth:1,borderRadius:0,shadow:'none',paddingX:32,paddingY:16,fontSize:12,fontWeight:600,motionStyle:'sweep'};
export function heritageHeader(header:HeaderSettings):HeaderSettings {return {...header,visualStyle:'glass-dark',transparent:true,background:'#0B0C0E',textColor:'#F9F8F5',mobileBackground:'#0B0C0E',mobileTextColor:'#F9F8F5',height:76,sticky:true,shadow:false,showUtilityRow:false,cta:{...header.cta,design:{...header.cta?.design,...heritageButton}}};}
export function heritageNavigation(nav:NavigationSettings):NavigationSettings {return {...nav,fontFamily:"'Plus Jakarta Sans', sans-serif",fontSize:12,fontWeight:500,letterSpacing:1.4,textTransform:'uppercase',textColor:'#B3B0A6',hoverColor:'#F9F8F5',activeColor:'#F9F8F5',motionStyle:'champagne-line',activeIndicatorColor:'#C5A880',activeBackground:'transparent',hoverBackground:'transparent',itemGap:10};}
export function heritageFooter(footer:FooterConfig):FooterConfig {return {...footer,visualStyle:'heritage',bgType:'custom',bgMode:'color',customBgColor:'#0B0C0E',textColor:'#B3B0A6',headingColor:'#F9F8F5',mutedTextColor:'#8E8B82',fontFamily:'Plus Jakarta Sans',headingFontFamily:'Cormorant Garamond'};}
export function heritageSection(section:LandingPageSection, variant:'editorial-light'|'editorial-dark'|'editorial-warm'|'editorial-split'):LandingPageSection {
 const dark=variant!=='editorial-light';const background=variant==='editorial-light'?'#F9F8F5':variant==='editorial-warm'?'#1A1614':'#14161B';const color=dark?'#F9F8F5':'#121316';
 return {...section,design:{...section.design,styleVariant:variant,backgroundType:'solid',backgroundColor:background,textColor:color,accentColor:'#C5A880',paddingTop:112,paddingBottom:112,boxShadow:'none',borderRadius:0},typographySettings:{...section.typographySettings,useGlobal:false,heading:{...section.typographySettings?.heading,fontFamily:"'Cormorant Garamond', Georgia, serif",fontSize:54,fontWeight:400,lineHeight:1.08,letterSpacing:-1.2,color},body:{...section.typographySettings?.body,fontFamily:"'Plus Jakarta Sans', sans-serif",fontSize:17,fontWeight:300,lineHeight:1.7,color:dark?'#B3B0A6':'#5C5B57'}},layoutSettings:{...section.layoutSettings,...(variant==='editorial-split'?{columns:2 as const,ratio:'40-60' as const,columnGap:32}:{}),widthMode:'boxed',containerWidth:1240}};
}
