import React from 'react';
import { Activity } from 'lucide-react';

import { useI18n } from '../i18n';
import { getBasePath } from '../lib/routes';
import {
  HEADER_NETWORK_CHANGE_EVENT,
  HEADER_NETWORK_IDS,
  readStoredHeaderNetwork,
  headerNetworkFullLabel,
  type HeaderNetwork,
} from '../lib/headerNetwork';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';
import { CockpitControlCards } from './CockpitControlCards';
import { DefiPositionsSection } from './DefiPositionsSection';

type PortfolioBlockBoundaryProps = {
  children: React.ReactNode;
  title: string;
  unavailableLabel: string;
  runtimeErrorLabel: string;
};

type PortfolioBlockBoundaryState = {
  hasError: boolean;
};

class PortfolioBlockBoundary extends React.Component<PortfolioBlockBoundaryProps, PortfolioBlockBoundaryState> {
  state: PortfolioBlockBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): PortfolioBlockBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`Portfolio block render failed: ${this.props.title}`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[2rem] border border-amber-500/15 bg-amber-500/[0.07] p-5 text-amber-100 backdrop-blur-md">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">{this.props.unavailableLabel}</div>
          <div className="mt-2 text-xl font-semibold text-white">{this.props.title}</div>
          <p className="mt-2 text-sm leading-6 text-amber-100/80">{this.props.runtimeErrorLabel}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export function PortfolioPage() {
  const { messages } = useI18n();
  const homeHref = getBasePath();
  const [selectedNetwork, setSelectedNetwork] = React.useState<string>(() => readStoredHeaderNetwork());
  const headerNetwork = selectedNetwork as HeaderNetwork;
  const headerNetworkName = headerNetworkFullLabel(headerNetwork, messages.navbar.chainNames);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    function onHeaderNetwork(ev: Event) {
      const networkDetail = (ev as CustomEvent<{ network?: HeaderNetwork }>).detail?.network;
      if (networkDetail && HEADER_NETWORK_IDS.includes(networkDetail)) {
        setSelectedNetwork(networkDetail);
      }
    }
    window.addEventListener(HEADER_NETWORK_CHANGE_EVENT, onHeaderNetwork);
    return () => window.removeEventListener(HEADER_NETWORK_CHANGE_EVENT, onHeaderNetwork);
  }, []);

  const cockpit = (
    <CockpitControlCards
      selectedNetwork={headerNetwork}
      selectedNetworkLabel={headerNetworkName}
    />
  );
  const defi = <DefiPositionsSection portfolioNetwork={headerNetwork} />;

  return (
    <main className="relative min-h-[calc(100vh-160px)] pb-14 pt-14">
      <PageBreadcrumbsBar
        items={[
          { label: messages.breadcrumbs.home, href: homeHref },
          { label: messages.portfolio.breadcrumbCurrent },
        ]}
      />
      <PageHeroShell
        badge={
          <PageHeroBadge
            label={`${messages.portfolio.badge} / ${headerNetworkName}`}
            icon={<Activity className="h-3.5 w-3.5" />}
            variant="teal"
          />
        }
        title={messages.portfolio.pageTitle}
        subtitle={messages.portfolio.subtitle}
        belowIntro={
          <div className="space-y-6">
            <PortfolioBlockBoundary
              title={messages.portfolio.commandRoutes}
              unavailableLabel={messages.app.sectionUnavailable}
              runtimeErrorLabel={messages.app.runtimeError}
            >
              {cockpit}
            </PortfolioBlockBoundary>
            <PortfolioBlockBoundary
              title={messages.portfolio.defiTitle}
              unavailableLabel={messages.app.sectionUnavailable}
              runtimeErrorLabel={messages.app.runtimeError}
            >
              {defi}
            </PortfolioBlockBoundary>
          </div>
        }
      />
    </main>
  );
}
