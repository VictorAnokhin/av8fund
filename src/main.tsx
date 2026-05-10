import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import '@mysten/dapp-kit/dist/index.css';
import App from "./app/App.tsx";
import { I18nProvider } from "./app/i18n.tsx";
import { SUI_NETWORK } from "./app/config.ts";
import { networkConfig } from "./app/lib/suiFund.ts";
import "./styles/index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={networkConfig} defaultNetwork={SUI_NETWORK}>
      <WalletProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </WalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>,
);
