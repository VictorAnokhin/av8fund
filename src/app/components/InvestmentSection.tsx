import React from 'react';

import { SuiFundDashboard } from './SuiFundDashboard';

type InvestmentSectionProps = {
  asPage?: boolean;
  omitIntro?: boolean;
};

export function InvestmentSection({ asPage = false, omitIntro = false }: InvestmentSectionProps) {
  return <SuiFundDashboard asPage={asPage} omitIntro={omitIntro} />;
}
