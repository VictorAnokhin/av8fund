import{c as m,u as S,g as T,R as i,j as e,e as g,T as U,a as z,f as A,d as b,b as R}from"./index-CDk3PvNI.js";import{I as p}from"./ImageWithFallback-CbzRkioL.js";import{P as B,a as H,b as $}from"./PageChrome-XVl3brbz.js";import{N as f}from"./newspaper-BR374WCU.js";/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]],E=m("arrow-left",C);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D=[["path",{d:"M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",key:"1jg4f8"}]],F=m("facebook",D);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=[["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}],["circle",{cx:"6",cy:"12",r:"3",key:"w7nqdw"}],["circle",{cx:"18",cy:"19",r:"3",key:"1xt0gg"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49",key:"47mynk"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49",key:"1n3mei"}]],q=m("share-2",L);function J({project:M,articleId:r}){const{language:n,messages:a}=S(),j=T(),[t,w]=i.useState(null),[u,v]=i.useState([]),[d,h]=i.useState(!0),[s,x]=i.useState(null);i.useEffect(()=>{let l=!1;async function k(){if(!r||r<=0){x(a.article.invalid),h(!1);return}try{h(!0),x(null);const[o,_]=await Promise.all([A(r,{fid:b,language:n}),R({fid:b,limit:4,language:n})]);if(l)return;w(o),v(_.filter(P=>P.id!==r).slice(0,3))}catch(o){l||x(o instanceof Error?o.message:a.article.error)}finally{l||h(!1)}}return k(),()=>{l=!0}},[r,n,a.article.error,a.article.invalid]);const c=typeof window<"u"?window.location.href:"",N=!d&&s?a.article.pageTitle:(t==null?void 0:t.title)??a.article.pageTitle,y=t&&!s?t.date||a.article.noDate:null;return e.jsxs("main",{className:"relative min-h-[calc(100vh-160px)] bg-slate-950 pb-20 pt-14",children:[e.jsx(B,{items:[{label:a.breadcrumbs.home,href:j},{label:a.blog.pageTitle,href:g()},{label:(t==null?void 0:t.title)||a.article.pageTitle}]}),e.jsx(H,{badge:e.jsx($,{label:a.article.heroBadge,icon:e.jsx(f,{className:"h-3.5 w-3.5"}),variant:"blue"}),title:N,subtitle:y,subtitleClassName:"max-w-3xl text-lg text-slate-400",afterSubtitle:t&&!d&&!s?e.jsxs("div",{className:"flex max-w-4xl flex-col gap-6 pt-2 sm:flex-row sm:items-center sm:justify-between",children:[e.jsxs("a",{href:g(),className:"inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-teal-300/90",children:[e.jsx(E,{size:20}),e.jsx("span",{children:a.article.back})]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[e.jsx("span",{className:"text-slate-500",children:a.article.share}),e.jsx("a",{href:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(c)}`,target:"_blank",rel:"noreferrer",className:"rounded-lg border border-white/10 bg-slate-900/70 p-2 transition-colors hover:bg-blue-400/10",children:e.jsx(F,{size:18,className:"text-white"})}),e.jsx("a",{href:`https://twitter.com/intent/tweet?url=${encodeURIComponent(c)}&text=${encodeURIComponent(t.title)}`,target:"_blank",rel:"noreferrer",className:"rounded-lg border border-white/10 bg-slate-900/70 p-2 transition-colors hover:bg-blue-400/10",children:e.jsx(U,{size:18,className:"text-white"})}),e.jsx("button",{type:"button",onClick:()=>{typeof navigator<"u"&&navigator.clipboard&&c&&navigator.clipboard.writeText(c)},className:"rounded-lg border border-white/10 bg-slate-900/70 p-2 transition-colors hover:bg-blue-400/10",children:e.jsx(q,{size:18,className:"text-white"})})]})]}):null}),e.jsx("div",{className:"mx-auto max-w-4xl px-6 py-10",children:d?e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"aspect-video animate-pulse rounded-3xl bg-white/5"}),e.jsx("div",{className:"h-80 animate-pulse rounded-3xl bg-white/5"})]}):s?e.jsx("div",{className:"rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-5 text-red-200",children:s}):t?e.jsxs(e.Fragment,{children:[t.imageUrl?e.jsx("div",{className:"mb-12 aspect-video overflow-hidden rounded-3xl",children:e.jsx(p,{src:t.imageUrl,alt:t.title,className:"h-full w-full object-cover"})}):null,e.jsxs("article",{className:"mb-8 rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur-md",children:[t.excerpt?e.jsx("p",{className:"mb-8 text-xl leading-relaxed text-slate-300",children:t.excerpt}):null,e.jsx("div",{className:"article-content text-white",dangerouslySetInnerHTML:{__html:t.body||`<p>${a.article.emptyBody}</p>`}})]}),u.length>0?e.jsxs("div",{className:"mt-16 border-t border-white/10 pt-12",children:[e.jsx("h3",{className:"mb-8 text-2xl text-white",children:a.article.related}),e.jsx("div",{className:"grid gap-6 md:grid-cols-3",children:u.map(l=>e.jsxs("a",{href:z(l.id),className:"group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 transition-all duration-300 hover:scale-[1.02]",children:[e.jsx("div",{className:"aspect-video overflow-hidden bg-black/20",children:l.imageUrl?e.jsx(p,{src:l.imageUrl,alt:l.title,className:"h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"}):e.jsx("div",{className:"flex h-full items-center justify-center text-slate-500",children:e.jsx(f,{size:32})})}),e.jsxs("div",{className:"p-4",children:[e.jsx("h4",{className:"line-clamp-2 text-white transition-colors group-hover:text-blue-400",children:l.title}),e.jsx("p",{className:"mt-2 text-sm text-slate-500",children:l.date||a.article.noDate})]})]},l.id))})]}):null]}):null}),e.jsx("style",{children:`
        .article-content {
          line-height: 1.8;
        }

        .article-content h1,
        .article-content h2,
        .article-content h3,
        .article-content h4 {
          color: #ffffff;
          margin: 1.5rem 0 0.75rem;
        }

        .article-content p,
        .article-content ul,
        .article-content ol,
        .article-content blockquote {
          margin: 0 0 1rem;
        }

        .article-content a {
          color: #60a5fa;
        }

        .article-content img {
          max-width: 100%;
          height: auto;
          border-radius: 1rem;
        }
      `})]})}export{J as ArticlePage};
