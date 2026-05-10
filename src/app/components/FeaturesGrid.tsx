import React from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRightLeft,
  BrainCircuit,
  Link,
  Radar,
  ShieldCheck,
} from 'lucide-react';

import { useI18n } from '../i18n';
import { getWhitepaperPath } from '../lib/routes';

export function FeaturesGrid() {
  const { messages } = useI18n();
  const whitepaperHref = getWhitepaperPath();
  const features = [
    {
      title: messages.features.cards[0].title,
      description: messages.features.cards[0].description,
      icon: <Link className="h-5 w-5 text-sky-300" />,
      accent: 'border-sky-400/20 bg-sky-400/10',
    },
    {
      title: messages.features.cards[1].title,
      description: messages.features.cards[1].description,
      icon: <Activity className="h-5 w-5 text-emerald-300" />,
      accent: 'border-emerald-400/20 bg-emerald-400/10',
    },
    {
      title: messages.features.cards[2].title,
      description: messages.features.cards[2].description,
      icon: <ArrowRightLeft className="h-5 w-5 text-amber-300" />,
      accent: 'border-amber-400/20 bg-amber-400/10',
    },
  ];

  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-[linear-gradient(180deg,_#020617_0%,_#050d19_100%)] py-24">
      <div className="absolute inset-0">
        <div className="absolute left-[10%] top-10 h-64 w-64 rounded-full bg-sky-500/8 blur-3xl" />
        <div className="absolute right-[10%] bottom-0 h-72 w-72 rounded-full bg-amber-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-14 grid gap-8 xl:grid-cols-[0.9fr_1.1fr] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              <Radar className="h-4 w-4 text-sky-300" />
              Mission Design
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-5xl">
              {messages.features.title}
              <span className="mt-2 block bg-gradient-to-r from-sky-300 to-amber-200 bg-clip-text text-transparent">
                {messages.features.highlight}
              </span>
            </h2>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="max-w-2xl text-lg leading-relaxed text-slate-300/80">
              {messages.features.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={whitepaperHref}
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-medium text-white transition hover:bg-white/10"
              >
                {messages.features.readWhitepaper}
              </a>
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                Minimum noise. Maximum control.
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: idx * 0.08 }}
                className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl"
              >
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border ${feature.accent}`}>
                  {feature.icon}
                </div>
                <div className="text-xl font-semibold text-white">{feature.title}</div>
                <p className="mt-4 text-sm leading-6 text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,15,29,0.96)_0%,rgba(10,26,45,0.88)_100%)] p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Operating Doctrine</div>
                <div className="mt-2 text-2xl font-semibold text-white">What the product must communicate</div>
              </div>
              <BrainCircuit className="h-5 w-5 text-amber-300" />
            </div>

            <div className="space-y-3">
              {[
                {
                  icon: <ShieldCheck className="h-4 w-4 text-emerald-300" />,
                  title: 'Safety first',
                  text: 'The interface should read like capital preservation with upside, not speculative noise.',
                },
                {
                  icon: <Radar className="h-4 w-4 text-sky-300" />,
                  title: 'Immediate orientation',
                  text: 'Users should see risk, liquidity, and asset mission roles in a single glance.',
                },
                {
                  icon: <Activity className="h-4 w-4 text-amber-300" />,
                  title: 'Visible execution',
                  text: 'Every rebalance and verification step needs a trust surface, not a hidden backend story.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-2">{item.icon}</div>
                    <div className="text-lg font-semibold text-white">{item.title}</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
