import React from 'react';

import { SuiFundDashboard } from './SuiFundDashboard';

type InvestmentSectionProps = {
  asPage?: boolean;
  omitIntro?: boolean;
  hideDepositPanel?: boolean;
  hideAiLogPanel?: boolean;
};

export function InvestmentSection({
  asPage = false,
  omitIntro = false,
  hideDepositPanel = false,
  hideAiLogPanel = false,
}: InvestmentSectionProps) {
  return (
    <SuiFundDashboard
      asPage={asPage}
      omitIntro={omitIntro}
      hideDepositPanel={hideDepositPanel}
      hideAiLogPanel={hideAiLogPanel}
    />
  );
}
