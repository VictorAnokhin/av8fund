import React from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Bot, ChevronDown, Loader2, Send, Sparkles } from 'lucide-react';

import { useI18n } from '../i18n';
import { sendAiChatMessage, type AiChatMessage } from '../lib/api';

type AiAssistantWidgetProps = {
  currentPage: string;
};

type ChatRow = AiChatMessage & {
  id: string;
};

function initialAssistantText(language: 'ru' | 'ua' | 'en'): string {
  if (language === 'en') {
    return 'Ask me how to invest, connect a wallet, work with AV8 shares, whitelist tokens, or use the fund admin tools.';
  }

  if (language === 'ua') {
    return 'Запитайте, як інвестувати, підключити гаманець, працювати з AV8, whitelist токенами або адмінкою фонду.';
  }

  return 'Спросите, как инвестировать, подключить кошелёк, работать с AV8, whitelist токенами или админкой фонда.';
}

export function AiAssistantWidget({ currentPage }: AiAssistantWidgetProps) {
  const { language } = useI18n();
  const account = useCurrentAccount();
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [rows, setRows] = React.useState<ChatRow[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: initialAssistantText(language),
    },
  ]);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [rows, open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const message = input.trim();
    if (!message || busy) {
      return;
    }

    const userRow: ChatRow = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: message,
    };

    setRows((current) => [...current, userRow]);
    setInput('');
    setError('');
    setBusy(true);

    try {
      const history = rows
        .filter((row) => row.id !== 'welcome')
        .slice(-6)
        .map(({ role, content }) => ({ role, content }));
      const response = await sendAiChatMessage({
        message,
        language,
        page: currentPage,
        wallet: account?.address,
        history,
      });

      setRows((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: response.answer,
        },
      ]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'AI assistant is unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-col items-end">
      {open ? (
        <div className="mb-3 w-[min(420px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-[0_24px_90px_-28px_rgba(45,212,191,0.5)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-300/10 text-teal-200">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">AV8 AI консультант</div>
                <div className="text-xs text-slate-500">OpenAI</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:text-white"
              aria-label="Свернуть AI консультанта"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="max-h-[380px] space-y-3 overflow-y-auto px-4 py-4">
            {rows.map((row) => (
              <div
                key={row.id}
                className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                  row.role === 'user'
                    ? 'ml-8 bg-teal-300 text-slate-950'
                    : 'mr-8 border border-white/10 bg-white/[0.05] text-slate-200'
                }`}
              >
                {row.content}
              </div>
            ))}
            {busy ? (
              <div className="mr-8 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                OpenAI отвечает...
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="border-t border-rose-400/15 bg-rose-400/10 px-4 py-3 text-xs leading-5 text-rose-100">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-white/10 p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Задайте вопрос по AV8..."
              className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300/40"
            />
            <button
              type="submit"
              disabled={busy || input.trim().length < 2}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-300 text-slate-950 transition hover:bg-teal-200 disabled:opacity-50"
              aria-label="Отправить вопрос"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-14 items-center gap-3 rounded-2xl border border-teal-300/25 bg-slate-950/90 px-4 font-semibold text-white shadow-[0_18px_60px_-22px_rgba(45,212,191,0.75)] backdrop-blur-xl transition hover:border-teal-200/45 hover:bg-slate-900"
      >
        <Sparkles className="h-5 w-5 text-teal-200" />
        AI консультант
      </button>
    </div>
  );
}
