import{d as i,j as e}from"./vendor-react-D1PLvkG5.js";import{I as u}from"./ImageWithFallback-DEGvx4Fa.js";import{P as S,a as A,b as T}from"./PageChrome-Bg_6UxMn.js";import{u as U,g as B,c as b,a as R,d as z,A as p,b as C}from"./index-B51lh9DV.js";import{x as E,F,r as _,y as D,u as g}from"./vendor-ui-CPxEyZpU.js";import"./vendor-buffer-Ch0pIN2T.js";import"./vendor-sui-DPoMA0tM.js";import"./preload-helper-uXat0MnT.js";function K({project:H,articleId:l}){const{language:c,messages:a}=U(),f=B(),[t,j]=i.useState(null),[x,w]=i.useState([]),[d,m]=i.useState(!0),[s,h]=i.useState(null);i.useEffect(()=>{let r=!1;async function y(){if(!l||l<=0){h(a.article.invalid),m(!1);return}try{m(!0),h(null);const[n,k]=await Promise.all([z(l,{fid:p,language:c}),C({fid:p,limit:4,language:c})]);if(r)return;j(n),w(k.filter(P=>P.id!==l).slice(0,3))}catch(n){r||h(n instanceof Error?n.message:a.article.error)}finally{r||m(!1)}}return y(),()=>{r=!0}},[l,c,a.article.error,a.article.invalid]);const o=typeof window<"u"?window.location.href:"",v=!d&&s?a.article.pageTitle:(t==null?void 0:t.title)??a.article.pageTitle,N=t&&!s?t.date||a.article.noDate:null;return e.jsxs("main",{className:"relative min-h-[calc(100vh-160px)] bg-slate-950 pb-20 pt-14",children:[e.jsx(S,{items:[{label:a.breadcrumbs.home,href:f},{label:a.blog.pageTitle,href:b()},{label:(t==null?void 0:t.title)||a.article.pageTitle}]}),e.jsx(A,{badge:e.jsx(T,{label:a.article.heroBadge,icon:e.jsx(g,{className:"h-3.5 w-3.5"}),variant:"blue"}),title:v,subtitle:N,subtitleClassName:"max-w-3xl text-lg text-slate-400",afterSubtitle:t&&!d&&!s?e.jsxs("div",{className:"flex max-w-4xl flex-col gap-6 pt-2 sm:flex-row sm:items-center sm:justify-between",children:[e.jsxs("a",{href:b(),className:"inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-teal-300/90",children:[e.jsx(E,{size:20}),e.jsx("span",{children:a.article.back})]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[e.jsx("span",{className:"text-slate-500",children:a.article.share}),e.jsx("a",{href:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(o)}`,target:"_blank",rel:"noreferrer",className:"rounded-lg border border-white/10 bg-slate-900/70 p-2 transition-colors hover:bg-blue-400/10",children:e.jsx(F,{size:18,className:"text-white"})}),e.jsx("a",{href:`https://twitter.com/intent/tweet?url=${encodeURIComponent(o)}&text=${encodeURIComponent(t.title)}`,target:"_blank",rel:"noreferrer",className:"rounded-lg border border-white/10 bg-slate-900/70 p-2 transition-colors hover:bg-blue-400/10",children:e.jsx(_,{size:18,className:"text-white"})}),e.jsx("button",{type:"button",onClick:()=>{typeof navigator<"u"&&navigator.clipboard&&o&&navigator.clipboard.writeText(o)},className:"rounded-lg border border-white/10 bg-slate-900/70 p-2 transition-colors hover:bg-blue-400/10",children:e.jsx(D,{size:18,className:"text-white"})})]})]}):null}),e.jsx("div",{className:"mx-auto max-w-4xl px-6 py-10",children:d?e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"aspect-video animate-pulse rounded-3xl bg-white/5"}),e.jsx("div",{className:"h-80 animate-pulse rounded-3xl bg-white/5"})]}):s?e.jsx("div",{className:"rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-5 text-red-200",children:s}):t?e.jsxs(e.Fragment,{children:[t.imageUrl?e.jsx("div",{className:"mb-12 aspect-video overflow-hidden rounded-3xl",children:e.jsx(u,{src:t.imageUrl,alt:t.title,className:"h-full w-full object-cover"})}):null,e.jsxs("article",{className:"mb-8 rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur-md",children:[t.excerpt?e.jsx("p",{className:"mb-8 text-xl leading-relaxed text-slate-300",children:t.excerpt}):null,e.jsx("div",{className:"article-content text-white",dangerouslySetInnerHTML:{__html:t.body||`<p>${a.article.emptyBody}</p>`}})]}),x.length>0?e.jsxs("div",{className:"mt-16 border-t border-white/10 pt-12",children:[e.jsx("h3",{className:"mb-8 text-2xl text-white",children:a.article.related}),e.jsx("div",{className:"grid gap-6 md:grid-cols-3",children:x.map(r=>e.jsxs("a",{href:R(r.id),className:"group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 transition-all duration-300 hover:scale-[1.02]",children:[e.jsx("div",{className:"aspect-video overflow-hidden bg-black/20",children:r.imageUrl?e.jsx(u,{src:r.imageUrl,alt:r.title,className:"h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"}):e.jsx("div",{className:"flex h-full items-center justify-center text-slate-500",children:e.jsx(g,{size:32})})}),e.jsxs("div",{className:"p-4",children:[e.jsx("h4",{className:"line-clamp-2 text-white transition-colors group-hover:text-blue-400",children:r.title}),e.jsx("p",{className:"mt-2 text-sm text-slate-500",children:r.date||a.article.noDate})]})]},r.id))})]}):null]}):null}),e.jsx("style",{children:`
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
      `})]})}export{K as ArticlePage};
