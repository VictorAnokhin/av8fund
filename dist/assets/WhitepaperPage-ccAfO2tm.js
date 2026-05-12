import{c as t,u as x,g as o,j as e,bW as d}from"./index-TXR-AlIM.js";import{P as m,a as h,b as p}from"./PageChrome-DnWxNRJv.js";import{F as y}from"./file-text-Bgq4OdQN.js";import{L as b}from"./layers-DwkFcE9Z.js";/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=[["path",{d:"M21.54 15H17a2 2 0 0 0-2 2v4.54",key:"1djwo0"}],["path",{d:"M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17",key:"1tzkfa"}],["path",{d:"M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05",key:"14pb5j"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],k=t("earth",g);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=[["line",{x1:"3",x2:"21",y1:"22",y2:"22",key:"j8o0r"}],["line",{x1:"6",x2:"6",y1:"18",y2:"11",key:"10tf0k"}],["line",{x1:"10",x2:"10",y1:"18",y2:"11",key:"54lgf6"}],["line",{x1:"14",x2:"14",y1:"18",y2:"11",key:"380y"}],["line",{x1:"18",x2:"18",y1:"18",y2:"11",key:"1kevvc"}],["polygon",{points:"12 2 20 7 4 7",key:"jkujk7"}]],u=t("landmark",j);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=[["rect",{width:"8",height:"8",x:"3",y:"3",rx:"2",key:"by2w9f"}],["path",{d:"M7 11v4a2 2 0 0 0 2 2h4",key:"xkn7yn"}],["rect",{width:"8",height:"8",x:"13",y:"13",rx:"2",key:"1cgmvn"}]],f=t("workflow",w),r=[b,f,d,u,k];function H(){const{messages:a}=x(),c=o();return e.jsxs("main",{className:"min-h-[calc(100vh-160px)] bg-slate-950 pb-20 pt-14",children:[e.jsx(m,{items:[{label:a.breadcrumbs.home,href:c},{label:a.whitepaper.pageTitle}]}),e.jsx(h,{badge:e.jsx(p,{label:a.whitepaper.badge,icon:e.jsx(y,{className:"h-3.5 w-3.5"}),variant:"blue"}),title:a.whitepaper.pageTitle,subtitle:a.whitepaper.intro,subtitleClassName:"max-w-3xl text-lg leading-relaxed text-slate-400"}),e.jsx("section",{className:"mx-auto max-w-7xl px-6 py-12",children:e.jsx("div",{className:"grid gap-6 md:grid-cols-2 xl:grid-cols-3",children:a.whitepaper.sections.map((s,i)=>{const n=r[i%r.length];return e.jsxs("article",{className:"rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur-md",children:[e.jsx("div",{className:"mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10",children:e.jsx(n,{className:"h-6 w-6 text-blue-400"})}),e.jsx("h2",{className:"mb-4 text-2xl font-bold text-white",children:s.title}),e.jsx("p",{className:"mb-6 text-slate-400",children:s.body}),e.jsx("ul",{className:"space-y-3",children:s.points.map(l=>e.jsxs("li",{className:"flex items-start gap-3 text-sm text-slate-300",children:[e.jsx("span",{className:"mt-1 h-2 w-2 rounded-full bg-emerald-400"}),e.jsx("span",{children:l})]},l))})]},s.title)})})})]})}export{H as WhitepaperPage};
