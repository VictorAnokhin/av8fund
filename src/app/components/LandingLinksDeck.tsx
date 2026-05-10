import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BrainCircuit, Network, ShieldCheck } from 'lucide-react';

import { getPortfolioPath } from '../lib/routes';

export function LandingLinksDeck() {
  const portfolioUrl = getPortfolioPath();

  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] bg-[linear-gradient(180deg,rgba(5,8,14,0.7)_0%,rgba(7,10,18,0.92)_100%)] px-6 py-14">
      <div className="absolute inset-0">
        <div className="absolute left-[10%] top-10 h-56 w-56 rounded-full bg-teal-400/[0.06] blur-3xl" />
        <div className="absolute right-[12%] bottom-0 h-56 w-56 rounded-full bg-violet-500/[0.05] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Navigation Deck</div>
            <div className="font-display mt-2 text-2xl font-medium tracking-tight text-white">
              Portfolio access and control surfaces
            </div>
          </div>
          <a
            href={portfolioUrl}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.04] px-5 py-3 text-sm font-semibold tracking-wide text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-[background,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/25 hover:bg-white/[0.07] hover:shadow-[0_0_36px_-14px_rgba(45,212,191,0.35)]"
          >
            Open Portfolio
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: 'Portfolio',
              hint: 'Open portfolio route',
              href: portfolioUrl,
              icon: <ArrowRight className="h-5 w-5 text-teal-300/90" />,
            },
            {
              title: 'Trust Surface',
              hint: 'Open transparency layer',
              href: portfolioUrl,
              icon: <ShieldCheck className="h-5 w-5 text-cyan-200/90" />,
            },
            {
              title: 'Object Map',
              hint: 'Go to portfolio structure',
              href: portfolioUrl,
              icon: <Network className="h-5 w-5 text-violet-300/85" />,
            },
            {
              title: 'AI Flight Log',
              hint: 'Review latest maneuvers',
              href: portfolioUrl,
              icon: <BrainCircuit className="h-5 w-5 text-slate-200/80" />,
            },
          ].map((item, index) => (
            <motion.a
              key={item.title}
              href={item.href}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="ce-glass-slab ce-glass-slab--interactive rounded-[1.5rem] p-4"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[rgba(4,8,18,0.5)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                {item.icon}
              </div>
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{item.hint}</div>
              <div className="font-display mt-3 text-xl font-medium tracking-tight text-white">{item.title}</div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
