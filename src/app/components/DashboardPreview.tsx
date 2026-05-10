import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BrainCircuit, Network, Shield } from 'lucide-react';

import { getPortfolioPath } from '../lib/routes';

export function DashboardPreview() {
  const portfolioHref = getPortfolioPath();

  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-[linear-gradient(180deg,_rgba(2,6,23,1)_0%,_rgba(5,12,24,1)_100%)] px-6 py-20">
      <div className="absolute inset-0">
        <div className="absolute left-[12%] top-8 h-56 w-56 rounded-full bg-sky-500/8 blur-3xl" />
        <div className="absolute right-[14%] bottom-0 h-56 w-56 rounded-full bg-amber-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
            <Network className="h-4 w-4 text-sky-300" />
            Portfolio Deck
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Sui operations now live in the dedicated portfolio deck
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-300/80">
            Horizon tracking, manifest structure, wallet control, object mapping, and AI flight logs are grouped in one portfolio route instead of spilling across the landing page.
          </p>
          <a
            href={portfolioHref}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-6 py-3 font-semibold text-slate-950 transition hover:brightness-110"
          >
            Open Portfolio
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Shield className="h-5 w-5 text-emerald-300" />,
              title: 'Trust Surface',
              text: 'Risk posture, liquidity, and owner access now live in one portfolio command route.',
            },
            {
              icon: <Network className="h-5 w-5 text-sky-300" />,
              title: 'Object Map',
              text: 'AV8 object relationships and allocation roles stay together instead of being split between pages.',
            },
            {
              icon: <BrainCircuit className="h-5 w-5 text-amber-300" />,
              title: 'AI Flight Log',
              text: 'System maneuvers remain visible, but now sit next to the portfolio context they act on.',
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70">
                {item.icon}
              </div>
              <div className="text-xl font-semibold text-white">{item.title}</div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
