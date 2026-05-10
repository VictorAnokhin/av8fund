import React from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Car, Building2, Coins, Gem, Image as ImageIcon, Shield, Terminal, Upload } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  SUI_NETWORK,
  SUI_RWA_ADMIN_CAP_ID,
  SUI_RWA_PACKAGE_ID,
  SUI_UTILITY_PACKAGE_ID,
  SUI_UTILITY_TREASURY_CAP_ID,
} from '../config';
import { useI18n } from '../i18n';
import {
  deleteRwaAdminCap,
  getRwaAdminCaps,
  saveRwaAdminCap,
  type RwaAdminCapRecord,
} from '../lib/api';
import { storeWalrusBlob, storeWalrusJson, type WalrusStoredBlob } from '../lib/walrus';
import { getBasePath } from '../lib/routes';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';

type AssetKind = 'vehicle' | 'business' | 'universal' | 'utility';

type BusinessKind = 'service' | 'shop' | 'rent';

function getExplorerTxUrl(digest: string): string {
  const network = SUI_NETWORK === 'mainnet' ? 'mainnet' : SUI_NETWORK === 'devnet' ? 'devnet' : 'testnet';
  return `https://suiexplorer.com/txblock/${encodeURIComponent(digest)}?network=${network}`;
}

function getExplorerObjectUrl(objectId: string): string {
  const network = SUI_NETWORK === 'mainnet' ? 'mainnet' : SUI_NETWORK === 'devnet' ? 'devnet' : 'testnet';
  return `https://suiexplorer.com/object/${encodeURIComponent(objectId)}?network=${network}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isValidSuiAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value.trim());
}

function findCreatedAssetNftId(result: unknown): string | null {
  if (!result || typeof result !== 'object' || !('objectChanges' in result)) {
    return null;
  }

  const objectChanges = (result as { objectChanges?: unknown }).objectChanges;
  if (!Array.isArray(objectChanges)) {
    return null;
  }

  const created = objectChanges.find((change) => {
    if (!change || typeof change !== 'object') {
      return false;
    }
    const item = change as { type?: unknown; objectType?: unknown };
    return item.type === 'created'
      && typeof item.objectType === 'string'
      && item.objectType.endsWith('::rwa_core::AssetNFT');
  }) as { objectId?: unknown } | undefined;

  return typeof created?.objectId === 'string' ? created.objectId : null;
}

function findCreatedAdminCapId(result: unknown): string | null {
  if (!result || typeof result !== 'object' || !('objectChanges' in result)) {
    return null;
  }

  const objectChanges = (result as { objectChanges?: unknown }).objectChanges;
  if (!Array.isArray(objectChanges)) {
    return null;
  }

  const created = objectChanges.find((change) => {
    if (!change || typeof change !== 'object') {
      return false;
    }
    const item = change as { type?: unknown; objectType?: unknown };
    return item.type === 'created'
      && typeof item.objectType === 'string'
      && item.objectType.endsWith('::rwa_core::AdminCap');
  }) as { objectId?: unknown } | undefined;

  return typeof created?.objectId === 'string' ? created.objectId : null;
}

function shortObjectId(value: string): string {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

function parseTokenAmount(value: string, decimals: number): bigint | null {
  const normalized = value.trim();
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    return null;
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > decimals) {
    return null;
  }

  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0');
}

function isValidSuiType(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}::[A-Za-z_][A-Za-z0-9_]*::[A-Za-z_][A-Za-z0-9_]*(?:<.+>)?$/.test(value.trim());
}

function fallbackAdminCapRecord(): RwaAdminCapRecord | null {
  if (!SUI_RWA_PACKAGE_ID || !SUI_RWA_ADMIN_CAP_ID) {
    return null;
  }

  return {
    id: 0,
    network: SUI_NETWORK,
    package_id: SUI_RWA_PACKAGE_ID,
    admin_cap_id: SUI_RWA_ADMIN_CAP_ID,
    owner_address: '',
    label: 'Default AdminCap',
    tx_digest: '',
    created_at: null,
  };
}

export function MintPage() {
  const { messages } = useI18n();
  const homeHref = getBasePath();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [assetKind, setAssetKind] = React.useState<AssetKind>('vehicle');

  const [makeModel, setMakeModel] = React.useState('');
  const [vin, setVin] = React.useState('');
  const [year, setYear] = React.useState('');
  const [mileage, setMileage] = React.useState('');
  const [docFiles, setDocFiles] = React.useState<File[]>([]);
  const [vehicleUsd, setVehicleUsd] = React.useState('');

  const [companyName, setCompanyName] = React.useState('');
  const [regNumber, setRegNumber] = React.useState('');
  const [businessType, setBusinessType] = React.useState<BusinessKind>('service');
  const [monthlyRevenue, setMonthlyRevenue] = React.useState('');
  const [legalAddress, setLegalAddress] = React.useState('');

  const [universalTitle, setUniversalTitle] = React.useState('');
  const [universalUsd, setUniversalUsd] = React.useState('');

  const defaultUtilityCoinType = React.useMemo(
    () => (SUI_UTILITY_PACKAGE_ID ? `${SUI_UTILITY_PACKAGE_ID}::utility_token::UTILITY_TOKEN` : ''),
    [],
  );
  const [utilityTokenName, setUtilityTokenName] = React.useState('AV8 Utility Token');
  const [utilityTokenSymbol, setUtilityTokenSymbol] = React.useState('AV8U');
  const [utilityTokenDecimals, setUtilityTokenDecimals] = React.useState('6');
  const [utilityLogoFile, setUtilityLogoFile] = React.useState<File | null>(null);
  const [utilityLogoUpload, setUtilityLogoUpload] = React.useState<WalrusStoredBlob | null>(null);
  const [utilityLogoBusy, setUtilityLogoBusy] = React.useState(false);
  const [utilityCoinType, setUtilityCoinType] = React.useState(defaultUtilityCoinType);
  const [utilityTreasuryCapId, setUtilityTreasuryCapId] = React.useState(SUI_UTILITY_TREASURY_CAP_ID);
  const [utilityRecipient, setUtilityRecipient] = React.useState('');
  const [utilityAmount, setUtilityAmount] = React.useState('');
  const [utilityBurnCoinId, setUtilityBurnCoinId] = React.useState('');
  const [utilityBusy, setUtilityBusy] = React.useState<'idle' | 'mint' | 'burn'>('idle');
  const [utilityError, setUtilityError] = React.useState<string | null>(null);
  const [utilityTxDigest, setUtilityTxDigest] = React.useState<string | null>(null);

  const [description, setDescription] = React.useState('');
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const coverPreviewUrl = React.useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : null), [coverFile]);
  const utilityLogoPreviewUrl = React.useMemo(() => (utilityLogoFile ? URL.createObjectURL(utilityLogoFile) : null), [utilityLogoFile]);
  React.useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);
  React.useEffect(() => {
    return () => {
      if (utilityLogoPreviewUrl) {
        URL.revokeObjectURL(utilityLogoPreviewUrl);
      }
    };
  }, [utilityLogoPreviewUrl]);

  const [flowPhase, setFlowPhase] = React.useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [phaseLabel, setPhaseLabel] = React.useState('');
  const [metadataCid, setMetadataCid] = React.useState<string | null>(null);
  const [txDigest, setTxDigest] = React.useState<string | null>(null);
  const [mintedAssetId, setMintedAssetId] = React.useState<string | null>(null);
  const [flowError, setFlowError] = React.useState<string | null>(null);
  const [offlineNote, setOfflineNote] = React.useState<string | null>(null);

  const [newAdminAddress, setNewAdminAddress] = React.useState('');
  const [adminBusy, setAdminBusy] = React.useState(false);
  const [adminError, setAdminError] = React.useState<string | null>(null);
  const [adminTxDigest, setAdminTxDigest] = React.useState<string | null>(null);
  const [adminCaps, setAdminCaps] = React.useState<RwaAdminCapRecord[]>(() => {
    const fallback = fallbackAdminCapRecord();
    return fallback ? [fallback] : [];
  });
  const [selectedAdminCapId, setSelectedAdminCapId] = React.useState(SUI_RWA_ADMIN_CAP_ID);
  const [adminCapsError, setAdminCapsError] = React.useState<string | null>(null);
  const [adminCapsLoading, setAdminCapsLoading] = React.useState(false);

  const selectedAdminCap = React.useMemo(
    () => adminCaps.find((cap) => cap.admin_cap_id === selectedAdminCapId) ?? null,
    [adminCaps, selectedAdminCapId],
  );

  const mergeAdminCaps = React.useCallback((items: RwaAdminCapRecord[]) => {
    const fallback = fallbackAdminCapRecord();
    const byCapId = new Map<string, RwaAdminCapRecord>();
    if (fallback) {
      byCapId.set(fallback.admin_cap_id, fallback);
    }
    for (const item of items) {
      byCapId.set(item.admin_cap_id, item);
    }
    const next = [...byCapId.values()];
    setAdminCaps(next);
    setSelectedAdminCapId((current) => {
      if (current && next.some((cap) => cap.admin_cap_id === current)) {
        return current;
      }
      return next[0]?.admin_cap_id ?? '';
    });
  }, []);

  const loadAdminCaps = React.useCallback(async () => {
    setAdminCapsLoading(true);
    setAdminCapsError(null);
    try {
      const items = await getRwaAdminCaps({
        network: SUI_NETWORK,
        packageId: SUI_RWA_PACKAGE_ID,
      });
      mergeAdminCaps(items);
    } catch (err) {
      setAdminCapsError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdminCapsLoading(false);
    }
  }, [mergeAdminCaps]);

  React.useEffect(() => {
    void loadAdminCaps();
  }, [loadAdminCaps]);

  const onDocDrop = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const incoming = [...event.dataTransfer.files];
    setDocFiles((prev) => [...prev, ...incoming]);
  }, []);

  const onDocInput = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = event.target.files;
    if (!incoming?.length) {
      return;
    }
    setDocFiles((prev) => [...prev, ...incoming]);
    event.target.value = '';
  }, []);

  const validate = React.useCallback((): boolean => {
    if (!description.trim() || !coverFile) {
      return false;
    }
    if (assetKind === 'vehicle') {
      return Boolean(
        makeModel.trim() && vin.trim() && year.trim() && mileage.trim() && vehicleUsd.trim() && docFiles.length > 0,
      );
    }
    if (assetKind === 'business') {
      return Boolean(
        companyName.trim() &&
          regNumber.trim() &&
          monthlyRevenue.trim() &&
          legalAddress.trim() &&
          vehicleUsd.trim(),
      );
    }
    return Boolean(universalTitle.trim() && universalUsd.trim());
  }, [
    assetKind,
    companyName,
    description,
    coverFile,
    docFiles.length,
    legalAddress,
    makeModel,
    mileage,
    monthlyRevenue,
    regNumber,
    universalTitle,
    universalUsd,
    vehicleUsd,
    vin,
    year,
  ]);

  const buildOracleMetadata = React.useCallback(
    (walrusBundle: { cover: WalrusStoredBlob; documents: Array<WalrusStoredBlob & { name: string; type: string; size: number }> }) => {
      const base = {
        schema: 'av8.rwa.metadata/v1',
        assetKind,
        description: description.trim(),
        cover: {
          blobId: walrusBundle.cover.blobId,
          url: walrusBundle.cover.url,
          objectId: walrusBundle.cover.objectId,
          size: walrusBundle.cover.size,
          endEpoch: walrusBundle.cover.endEpoch,
        },
        coverCid: walrusBundle.cover.blobId,
        coverUrl: walrusBundle.cover.url,
        documents: walrusBundle.documents.map((document) => ({
          name: document.name,
          type: document.type,
          size: document.size,
          blobId: document.blobId,
          url: document.url,
          objectId: document.objectId,
          endEpoch: document.endEpoch,
        })),
        appraisalUsd:
          assetKind === 'universal'
            ? Number.parseFloat(universalUsd) || 0
            : Number.parseFloat(vehicleUsd) || 0,
        identifiers: {} as Record<string, string>,
        business: undefined as
          | {
              companyName: string;
              registrationId: string;
              businessType: BusinessKind;
              monthlyRevenueUsd: number;
              legalAddressOrMapsUrl: string;
            }
          | undefined,
        vehicle: undefined as
          | { makeModel: string; vin: string; year: number; mileageKm: number; vinLockedAfterMint: true }
          | undefined,
        universal: undefined as { title: string } | undefined,
      };

      if (assetKind === 'vehicle') {
        base.identifiers.vin = vin.trim();
        base.vehicle = {
          makeModel: makeModel.trim(),
          vin: vin.trim(),
          year: Number.parseInt(year, 10) || 0,
          mileageKm: Number.parseFloat(mileage) || 0,
          vinLockedAfterMint: true,
        };
      } else if (assetKind === 'business') {
        base.identifiers.registrationId = regNumber.trim();
        base.business = {
          companyName: companyName.trim(),
          registrationId: regNumber.trim(),
          businessType,
          monthlyRevenueUsd: Number.parseFloat(monthlyRevenue) || 0,
          legalAddressOrMapsUrl: legalAddress.trim(),
        };
      } else {
        base.universal = { title: universalTitle.trim() };
      }

      return base;
    },
    [
      assetKind,
      businessType,
      companyName,
      description,
      legalAddress,
      makeModel,
      mileage,
      monthlyRevenue,
      regNumber,
      universalTitle,
      universalUsd,
      vehicleUsd,
      vin,
      year,
    ],
  );

  const handleMint = React.useCallback(async () => {
    setFlowError(null);
    setOfflineNote(null);
    setTxDigest(null);
    setMintedAssetId(null);
    setMetadataCid(null);

    if (!validate()) {
      setFlowError(messages.mint.validationRequired);
      return;
    }

    if (SUI_RWA_PACKAGE_ID && !selectedAdminCapId) {
      setFlowError(messages.mint.adminCapMissing);
      return;
    }

    if (SUI_RWA_PACKAGE_ID && !account?.address) {
      setFlowError(messages.mint.connectWalletHint);
      return;
    }

    setFlowPhase('running');
    setPhaseLabel(messages.mint.phaseEncrypt);
    await sleep(900);
    setPhaseLabel(messages.mint.phaseWalrus);

    try {
      const coverUpload = await storeWalrusBlob(coverFile!, {
        contentType: coverFile!.type || 'application/octet-stream',
        sendObjectTo: account?.address,
      });
      const documentUploads: Array<WalrusStoredBlob & { name: string; type: string; size: number }> = [];

      for (const file of docFiles) {
        const uploaded = await storeWalrusBlob(file, {
          contentType: file.type || 'application/octet-stream',
          sendObjectTo: account?.address,
        });
        documentUploads.push({
          ...uploaded,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
        });
      }

      const metadata = buildOracleMetadata({
        cover: coverUpload,
        documents: documentUploads,
      });
      const metadataUpload = await storeWalrusJson(
        {
          ...metadata,
          walrus: {
            publisherNetwork: SUI_NETWORK,
          },
        },
        { sendObjectTo: account?.address },
      );
      const metadataUri = metadataUpload.url;
      setMetadataCid(metadataUpload.blobId);

      await sleep(800);
      setPhaseLabel(messages.mint.phaseMove);

      if (SUI_RWA_PACKAGE_ID && selectedAdminCapId && account?.address) {
        const valuationSource = assetKind === 'universal' ? universalUsd : vehicleUsd;
        const initialUsd = Math.max(0, Math.round(Number.parseFloat(valuationSource) || 0));
        const assetName = assetKind === 'vehicle'
          ? makeModel.trim() || vin.trim()
          : assetKind === 'business'
            ? companyName.trim() || regNumber.trim()
            : universalTitle.trim();
        const identifier = assetKind === 'vehicle'
          ? vin.trim()
          : assetKind === 'business'
            ? regNumber.trim()
            : universalTitle.trim();

        const tx = new Transaction();
        tx.moveCall({
          target: `${SUI_RWA_PACKAGE_ID}::rwa_core::mint_asset` as `${string}::${string}::${string}`,
          arguments: [
            tx.object(selectedAdminCapId),
            tx.pure.string(assetName),
            tx.pure.string(assetKind),
            tx.pure.string(identifier),
            tx.pure.string(coverUpload.url),
            tx.pure.string(metadataUri),
            tx.pure.u64(BigInt(initialUsd)),
          ],
        });

        const result = await signAndExecuteTransaction({ transaction: tx });
        const digest =
          result && typeof result === 'object' && 'digest' in result && typeof (result as { digest: unknown }).digest === 'string'
            ? (result as { digest: string }).digest
            : null;
        if (!digest) {
          throw new Error('Missing transaction digest in wallet response.');
        }
        const transaction = await suiClient.waitForTransaction({
          digest,
          options: {
            showObjectChanges: true,
            showEffects: true,
          },
        });
        setMintedAssetId(findCreatedAssetNftId(transaction));
        setTxDigest(digest);
        setOfflineNote(null);
      } else if (!SUI_RWA_PACKAGE_ID) {
        setOfflineNote(messages.mint.packageMissing);
      } else {
        setOfflineNote(messages.mint.nonVehicleNote);
      }

      setFlowPhase('success');
    } catch (err) {
      console.error(err);
      setFlowPhase('error');
      setFlowError(`${messages.mint.errorPrefix}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [
    account?.address,
    assetKind,
    buildOracleMetadata,
    companyName,
    description,
    docFiles,
    makeModel,
    messages.mint.adminCapMissing,
    messages.mint.connectWalletHint,
    messages.mint.errorPrefix,
    messages.mint.nonVehicleNote,
    messages.mint.packageMissing,
    messages.mint.phaseEncrypt,
    messages.mint.phaseMove,
    messages.mint.phaseWalrus,
    messages.mint.validationRequired,
    mileage,
    monthlyRevenue,
    regNumber,
    selectedAdminCapId,
    signAndExecuteTransaction,
    suiClient,
    SUI_RWA_PACKAGE_ID,
    universalTitle,
    universalUsd,
    validate,
    vehicleUsd,
    vin,
    year,
    coverFile,
  ]);

  const submitUtilityTransaction = React.useCallback(async (mode: 'mint' | 'burn') => {
    setUtilityError(null);
    setUtilityTxDigest(null);

    const coinType = utilityCoinType.trim();
    const treasuryCapId = utilityTreasuryCapId.trim();
    const decimals = Number.parseInt(utilityTokenDecimals, 10);

    if (!SUI_UTILITY_PACKAGE_ID || !treasuryCapId || !isValidSuiType(coinType)) {
      setUtilityError(messages.mint.utilityConfigMissing);
      return;
    }

    if (!account?.address) {
      setUtilityError(messages.mint.connectWalletHint);
      return;
    }

    const tx = new Transaction();
    if (mode === 'mint') {
      const recipient = utilityRecipient.trim();
      const amount = parseTokenAmount(utilityAmount, decimals);

      if (!isValidSuiAddress(recipient) || amount === null || amount <= 0n) {
        setUtilityError(messages.mint.validationRequired);
        return;
      }

      tx.moveCall({
        target: `${SUI_UTILITY_PACKAGE_ID}::utility_token::mint_any` as `${string}::${string}::${string}`,
        typeArguments: [coinType],
        arguments: [
          tx.object(treasuryCapId),
          tx.pure.u64(amount),
          tx.pure.address(recipient),
        ],
      });
    } else {
      const coinId = utilityBurnCoinId.trim();
      if (!isValidSuiAddress(coinId)) {
        setUtilityError(messages.mint.validationRequired);
        return;
      }

      tx.moveCall({
        target: `${SUI_UTILITY_PACKAGE_ID}::utility_token::burn_any` as `${string}::${string}::${string}`,
        typeArguments: [coinType],
        arguments: [
          tx.object(treasuryCapId),
          tx.object(coinId),
        ],
      });
    }

    setUtilityBusy(mode);
    try {
      const result = await signAndExecuteTransaction({ transaction: tx });
      const digest =
        result && typeof result === 'object' && 'digest' in result && typeof (result as { digest: unknown }).digest === 'string'
          ? (result as { digest: string }).digest
          : null;
      if (!digest) {
        throw new Error('Missing transaction digest in wallet response.');
      }

      await suiClient.waitForTransaction({
        digest,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      setUtilityTxDigest(digest);
      if (mode === 'mint') {
        setUtilityAmount('');
      } else {
        setUtilityBurnCoinId('');
      }
    } catch (err) {
      console.error(err);
      setUtilityError(err instanceof Error ? err.message : String(err));
    } finally {
      setUtilityBusy('idle');
    }
  }, [
    SUI_UTILITY_PACKAGE_ID,
    account?.address,
    messages.mint.connectWalletHint,
    messages.mint.utilityConfigMissing,
    messages.mint.validationRequired,
    signAndExecuteTransaction,
    suiClient,
    utilityAmount,
    utilityBurnCoinId,
    utilityCoinType,
    utilityTokenDecimals,
    utilityRecipient,
    utilityTreasuryCapId,
  ]);

  const uploadUtilityLogo = React.useCallback(async () => {
    setUtilityError(null);
    setUtilityLogoUpload(null);

    if (!utilityLogoFile) {
      setUtilityError(messages.mint.validationRequired);
      return;
    }

    setUtilityLogoBusy(true);
    try {
      const uploaded = await storeWalrusBlob(utilityLogoFile, {
        contentType: utilityLogoFile.type || 'application/octet-stream',
        sendObjectTo: account?.address,
      });
      setUtilityLogoUpload(uploaded);
    } catch (err) {
      console.error(err);
      setUtilityError(err instanceof Error ? err.message : String(err));
    } finally {
      setUtilityLogoBusy(false);
    }
  }, [account?.address, messages.mint.validationRequired, utilityLogoFile]);

  const resetFlow = React.useCallback(() => {
    setFlowPhase('idle');
    setFlowError(null);
    setOfflineNote(null);
    setTxDigest(null);
    setMintedAssetId(null);
    setMetadataCid(null);
    setPhaseLabel('');
  }, []);

  const handleAuthorizeAdmin = React.useCallback(async () => {
    setAdminError(null);
    setAdminTxDigest(null);

    if (!SUI_RWA_PACKAGE_ID || !selectedAdminCapId) {
      setAdminError(messages.mint.adminCapMissing);
      return;
    }

    if (!account?.address) {
      setAdminError(messages.mint.governanceWalletHint);
      return;
    }

    const recipient = newAdminAddress.trim();
    if (!isValidSuiAddress(recipient)) {
      setAdminError(messages.mint.invalidAdminAddress);
      return;
    }

    setAdminBusy(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${SUI_RWA_PACKAGE_ID}::rwa_core::create_new_admin`,
        arguments: [tx.object(selectedAdminCapId), tx.pure.address(recipient)],
      });

      const result = await signAndExecuteTransaction({ transaction: tx });
      const digest =
        result && typeof result === 'object' && 'digest' in result && typeof (result as { digest: unknown }).digest === 'string'
          ? (result as { digest: string }).digest
          : null;
      if (!digest) {
        throw new Error('Missing transaction digest in wallet response.');
      }
      const transaction = await suiClient.waitForTransaction({
        digest,
        options: {
          showObjectChanges: true,
          showEffects: true,
        },
      });
      const adminCapId = findCreatedAdminCapId(transaction);
      if (!adminCapId) {
        throw new Error('Missing AdminCap object ID in transaction object changes.');
      }
      let saved: RwaAdminCapRecord = {
        id: 0,
        network: SUI_NETWORK,
        package_id: SUI_RWA_PACKAGE_ID,
        admin_cap_id: adminCapId,
        owner_address: recipient,
        label: `AdminCap ${shortObjectId(recipient)}`,
        tx_digest: digest,
        created_at: null,
      };
      try {
        saved = await saveRwaAdminCap({
          network: SUI_NETWORK,
          packageId: SUI_RWA_PACKAGE_ID,
          adminCapId,
          ownerAddress: recipient,
          label: saved.label,
          txDigest: digest,
        });
        setAdminCapsError(null);
      } catch (saveErr) {
        setAdminCapsError(
          `AdminCap created on-chain, but could not be saved to API: ${
            saveErr instanceof Error ? saveErr.message : String(saveErr)
          }`,
        );
      }
      setAdminCaps((current) => {
        const byCapId = new Map(current.map((item) => [item.admin_cap_id, item]));
        byCapId.set(saved.admin_cap_id, saved);
        return [...byCapId.values()];
      });
      setSelectedAdminCapId(saved.admin_cap_id);
      setAdminTxDigest(digest);
      setNewAdminAddress('');
    } catch (err) {
      console.error(err);
      setAdminError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdminBusy(false);
    }
  }, [
    SUI_RWA_PACKAGE_ID,
    account?.address,
    messages.mint.adminCapMissing,
    messages.mint.governanceWalletHint,
    messages.mint.invalidAdminAddress,
    newAdminAddress,
    selectedAdminCapId,
    signAndExecuteTransaction,
    suiClient,
  ]);

  const handleDeleteAdminCap = React.useCallback(async (cap: RwaAdminCapRecord) => {
    if (cap.id === 0) {
      return;
    }

    setAdminCapsError(null);
    try {
      await deleteRwaAdminCap(cap.id);
      setAdminCaps((current) => {
        const next = current.filter((item) => item.id !== cap.id);
        setSelectedAdminCapId((selected) => {
          if (selected !== cap.admin_cap_id) {
            return selected;
          }
          return next[0]?.admin_cap_id ?? '';
        });
        return next;
      });
    } catch (err) {
      setAdminCapsError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const segmentBtn =
    'flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60';

  return (
    <main className="relative min-h-[calc(100vh-160px)] overflow-x-hidden pb-24 pt-14 text-slate-100">
      <PageBreadcrumbsBar
        items={[
          { label: messages.breadcrumbs.home, href: homeHref },
          { label: messages.mint.pageTitle },
        ]}
      />
      <PageHeroShell
        badge={
          <PageHeroBadge label={messages.mint.heroBadge} icon={<Gem className="h-3.5 w-3.5" />} variant="emerald" />
        }
        title={messages.mint.pageTitle}
        subtitle={messages.mint.subtitle}
      />

      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-8">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex flex-col gap-1 rounded-[1.4rem] bg-gradient-to-b from-white/[0.12] to-white/[0.02] p-1 sm:flex-row">
                {(
                  [
                    { id: 'vehicle' as const, label: messages.mint.assetVehicle, icon: Car },
                    { id: 'business' as const, label: messages.mint.assetBusiness, icon: Building2 },
                    { id: 'universal' as const, label: messages.mint.assetUniversal, icon: Gem },
                    { id: 'utility' as const, label: messages.mint.utilityTab, icon: Coins },
                  ] as const
                ).map(({ id, label, icon: Icon }) => {
                  const active = assetKind === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`relative ${segmentBtn} ${active ? 'text-slate-950 shadow-[0_8px_32px_rgba(34,211,238,0.25)]' : 'text-slate-400 hover:text-white'}`}
                      onClick={() => {
                        setAssetKind(id);
                        resetFlow();
                      }}
                    >
                      {active ? (
                        <motion.span
                          layoutId="mintSeg"
                          className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-cyan-200 via-sky-400 to-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_0_24px_rgba(56,189,248,0.35)]"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      ) : null}
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <Icon className="h-4 w-4 opacity-90" />
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.12),transparent_45%),radial-gradient(circle_at_80%_100%,rgba(14,165,233,0.1),transparent_40%),linear-gradient(180deg,#020617_0%,#0b1220_100%)] p-6 md:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">{messages.mint.step2Label}</div>
                  <h2 className="mt-1 text-xl font-semibold text-white">Intake</h2>
                </div>
              </div>

              <div className="space-y-5">
                {assetKind === 'vehicle' ? (
                  <>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.makeModel}</label>
                    <input
                      value={makeModel}
                      onChange={(e) => setMakeModel(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none ring-cyan-400/0 transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                      placeholder="Tesla Model Y"
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.vin}</label>
                        <input
                          value={vin}
                          onChange={(e) => setVin(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 font-mono text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.estimatedUsd}</label>
                        <input
                          type="number"
                          min={0}
                          value={vehicleUsd}
                          onChange={(e) => setVehicleUsd(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.year}</label>
                        <input
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.mileage}</label>
                        <input
                          value={mileage}
                          onChange={(e) => setMileage(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.docsLabel}</label>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={onDocDrop}
                        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-500/35 bg-cyan-500/[0.06] px-4 py-8 text-center transition hover:border-cyan-400/55 hover:bg-cyan-500/10"
                      >
                        <Upload className="mb-2 h-8 w-8 text-cyan-300/80" />
                        <p className="text-sm text-slate-300">{messages.mint.docsDrop}</p>
                        <label className="mt-3 text-xs font-semibold uppercase tracking-wider text-cyan-300 hover:text-cyan-200">
                          Browse files
                          <input type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={onDocInput} />
                        </label>
                        {docFiles.length ? (
                          <ul className="mt-4 w-full max-w-md space-y-1 text-left text-xs text-slate-400">
                            {docFiles.map((f) => (
                              <li key={`${f.name}-${f.size}`} className="truncate font-mono">
                                {f.name}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : null}

                {assetKind === 'business' ? (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.companyName}</label>
                      <input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.regNumber}</label>
                        <input
                          value={regNumber}
                          onChange={(e) => setRegNumber(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.businessType}</label>
                        <select
                          value={businessType}
                          onChange={(e) => setBusinessType(e.target.value as BusinessKind)}
                          className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                        >
                          <option value="service">{messages.mint.bizService}</option>
                          <option value="shop">{messages.mint.bizShop}</option>
                          <option value="rent">{messages.mint.bizRent}</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.revenueMonthly}</label>
                        <input
                          type="number"
                          min={0}
                          value={monthlyRevenue}
                          onChange={(e) => setMonthlyRevenue(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.estimatedUsd}</label>
                        <input
                          type="number"
                          min={0}
                          value={vehicleUsd}
                          onChange={(e) => setVehicleUsd(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.legalAddress}</label>
                      <input
                        value={legalAddress}
                        onChange={(e) => setLegalAddress(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                        placeholder="https://maps.google.com/..."
                      />
                    </div>
                  </>
                ) : null}

                {assetKind === 'universal' ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.universalTitle}</label>
                        <input
                          value={universalTitle}
                          onChange={(e) => setUniversalTitle(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.estimatedUsd}</label>
                        <input
                          type="number"
                          min={0}
                          value={universalUsd}
                          onChange={(e) => setUniversalUsd(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                {assetKind === 'utility' ? (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-semibold text-white">{messages.mint.utilityTitle}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{messages.mint.utilityBlurb}</p>
                      <p className="mt-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-50">
                        {messages.mint.utilityCreationNote}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] p-4">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {messages.mint.utilityConstants}
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                            {messages.mint.utilityTokenName}
                          </label>
                          <input
                            value={utilityTokenName}
                            onChange={(e) => setUtilityTokenName(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                            {messages.mint.utilityTokenSymbol}
                          </label>
                          <input
                            value={utilityTokenSymbol}
                            onChange={(e) => setUtilityTokenSymbol(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 font-mono text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                            {messages.mint.utilityTokenDecimals}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={18}
                            value={utilityTokenDecimals}
                            onChange={(e) => setUtilityTokenDecimals(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                            {messages.mint.utilityTokenLogo}
                          </label>
                          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-[rgba(4,8,16,0.48)] p-3">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-400/40">
                              <ImageIcon className="h-4 w-4" />
                              {messages.mint.utilityChooseLogo}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0] ?? null;
                                  setUtilityLogoFile(f);
                                  setUtilityLogoUpload(null);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            {utilityLogoPreviewUrl ? (
                              <img src={utilityLogoPreviewUrl} alt="" className="h-14 w-14 rounded-lg border border-white/10 object-cover" />
                            ) : null}
                            <button
                              type="button"
                              disabled={!utilityLogoFile || utilityLogoBusy}
                              onClick={() => void uploadUtilityLogo()}
                              className="rounded-xl border border-cyan-400/25 px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {utilityLogoBusy ? messages.mint.utilityLogoBusy : messages.mint.utilityUploadLogo}
                            </button>
                          </div>
                          {utilityLogoUpload ? (
                            <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-50">
                              <div>{messages.mint.utilityLogoReady}</div>
                              <div className="mt-1 break-all font-mono text-emerald-100/90">{utilityLogoUpload.url}</div>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs leading-relaxed text-slate-500">{messages.mint.utilityLogoHint}</p>
                          )}
                        </div>
                        <div className="md:col-span-3">
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                            {messages.mint.utilityCoinType}
                          </label>
                          <input
                            value={utilityCoinType}
                            onChange={(e) => setUtilityCoinType(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 font-mono text-xs text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                            placeholder="0x...::module::TOKEN"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                            {messages.mint.utilityTreasuryCap}
                          </label>
                          <input
                            value={utilityTreasuryCapId}
                            onChange={(e) => setUtilityTreasuryCapId(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 font-mono text-xs text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                            placeholder="0x..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                          {messages.mint.utilityRecipient}
                        </label>
                        <input
                          value={utilityRecipient}
                          onChange={(e) => setUtilityRecipient(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 font-mono text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                          placeholder="0x..."
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                          {messages.mint.utilityAmount}
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.000001"
                          value={utilityAmount}
                          onChange={(e) => setUtilityAmount(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                          placeholder="1000"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={utilityBusy !== 'idle'}
                      onClick={() => void submitUtilityTransaction('mint')}
                      className="w-full rounded-2xl border border-cyan-400/35 bg-gradient-to-r from-cyan-900/80 via-sky-800/90 to-blue-700 px-4 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_0_28px_rgba(34,211,238,0.22)] transition hover:shadow-[0_0_40px_rgba(34,211,238,0.32)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {utilityBusy === 'mint' ? messages.mint.utilityBusy : messages.mint.utilityMint}
                    </button>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                        {messages.mint.utilityCoinObject}
                      </label>
                      <input
                        value={utilityBurnCoinId}
                        onChange={(e) => setUtilityBurnCoinId(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 font-mono text-sm text-white outline-none focus:border-rose-400/40 focus:ring-2 focus:ring-rose-400/30"
                        placeholder="0x..."
                      />
                    </div>

                    <button
                      type="button"
                      disabled={utilityBusy !== 'idle'}
                      onClick={() => void submitUtilityTransaction('burn')}
                      className="w-full rounded-2xl border border-rose-400/35 bg-gradient-to-r from-rose-950/85 via-red-900/90 to-orange-800 px-4 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_0_28px_rgba(251,113,133,0.2)] transition hover:shadow-[0_0_40px_rgba(251,113,133,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {utilityBusy === 'burn' ? messages.mint.utilityBusy : messages.mint.utilityBurn}
                    </button>

                    {utilityError ? (
                      <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{utilityError}</div>
                    ) : null}

                    {utilityTxDigest ? (
                      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-50">
                        <p>{messages.mint.utilitySuccess}</p>
                        <p className="mt-2 break-all font-mono text-xs text-emerald-100/90">{utilityTxDigest}</p>
                        <a
                          href={getExplorerTxUrl(utilityTxDigest)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200"
                        >
                          {messages.mint.openExplorer}
                        </a>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {assetKind !== 'utility' ? (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.coverLabel}</label>
                      <p className="mb-2 text-xs text-slate-500">{messages.mint.coverHint}</p>
                      <div className="flex flex-wrap items-start gap-4">
                        <label className="cursor-pointer rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-cyan-200 transition hover:border-cyan-400/40">
                          Choose image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              setCoverFile(f ?? null);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        {coverPreviewUrl ? (
                          <img src={coverPreviewUrl} alt="" className="h-24 w-24 rounded-xl border border-white/10 object-cover ring-1 ring-cyan-400/20" />
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">{messages.mint.descriptionLabel}</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        placeholder={messages.mint.descriptionPlaceholder}
                        className="w-full rounded-xl border border-white/10 bg-[rgba(4,8,16,0.68)] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-28">
            <div className="rounded-[1.75rem] border border-white/10 bg-[rgba(5,9,18,0.82)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">{messages.mint.step3Label}</div>
              <p className="mt-2 text-sm text-slate-400">{messages.mint.blockchainHint}</p>

              <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <ConnectButton className="!w-full !justify-center !rounded-xl !border !border-white/10 !bg-slate-900 !py-3 !text-sm !font-semibold !text-white hover:!bg-slate-800" />
              </div>

              <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    AdminCap
                  </label>
                  <button
                    type="button"
                    onClick={() => void loadAdminCaps()}
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    {adminCapsLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>
                <select
                  value={selectedAdminCapId}
                  onChange={(event) => setSelectedAdminCapId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[rgba(5,9,18,0.72)] px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/25"
                >
                  {adminCaps.length === 0 ? <option value="">No AdminCap saved</option> : null}
                  {adminCaps.map((cap) => (
                    <option key={`${cap.id}-${cap.admin_cap_id}`} value={cap.admin_cap_id}>
                      {(cap.label || 'AdminCap')} · {shortObjectId(cap.admin_cap_id)}
                      {cap.owner_address ? ` · owner ${shortObjectId(cap.owner_address)}` : ''}
                    </option>
                  ))}
                </select>
                {selectedAdminCap ? (
                  <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                    <div className="break-all">Cap: <span className="font-mono text-slate-300">{selectedAdminCap.admin_cap_id}</span></div>
                    {selectedAdminCap.owner_address ? (
                      <div className="break-all">Owner: <span className="font-mono text-slate-300">{selectedAdminCap.owner_address}</span></div>
                    ) : null}
                  </div>
                ) : null}
                {adminCapsError ? (
                  <div className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    {adminCapsError}
                  </div>
                ) : null}
              </div>

              {flowError && flowPhase !== 'running' ? (
                <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{flowError}</div>
              ) : null}

              {assetKind !== 'utility' ? (
                <>
                  <button
                    type="button"
                    disabled={flowPhase === 'running'}
                    onClick={() => void handleMint()}
                    className="group relative mt-6 w-full overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-[#0c1b4d] via-[#0b4f7c] to-[#22d3ee] px-4 py-4 text-center text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_40px_rgba(34,211,238,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:shadow-[0_0_52px_rgba(34,211,238,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="relative z-10">{flowPhase === 'running' ? messages.mint.ctaLoading : messages.mint.cta}</span>
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.45),transparent_55%)] opacity-70 mix-blend-screen transition group-hover:opacity-100" />
                  </button>

                  <p className="mt-4 text-xs leading-relaxed text-slate-500">{messages.mint.metadataNote}</p>
                </>
              ) : null}
            </div>

            <AnimatePresence>
              {flowPhase === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, y: 16, rotateX: 18 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                  className="rounded-[1.75rem] border border-emerald-500/25 bg-emerald-500/[0.07] p-6 perspective-[1200px]"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <motion.div
                    initial={{ rotateY: -18, scale: 0.92 }}
                    animate={{ rotateY: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 90, damping: 14 }}
                    className="relative mx-auto aspect-[4/5] w-full max-w-[220px] rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900/50 p-4 shadow-[0_25px_60px_rgba(34,211,238,0.2)] ring-1 ring-white/10"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="absolute inset-x-4 top-4 h-1 rounded-full bg-gradient-to-r from-cyan-300/0 via-cyan-300 to-cyan-300/0 opacity-80" />
                    {coverPreviewUrl ? (
                      <img src={coverPreviewUrl} alt="" className="mt-5 h-28 w-full rounded-lg object-cover ring-1 ring-white/10" />
                    ) : null}
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-cyan-200/90">{messages.mint.success}</p>
                    <p className="mt-2 line-clamp-3 text-xs text-slate-300">{description}</p>
                    {metadataCid ? (
                      <p className="mt-3 break-all font-mono text-[10px] text-slate-400">CID {metadataCid}</p>
                    ) : null}
                  </motion.div>

                  {txDigest ? (
                    <div className="mt-6 text-center">
                      <div className="text-xs uppercase tracking-wider text-slate-500">{messages.mint.digestLabel}</div>
                      <div className="mt-1 break-all font-mono text-xs text-cyan-100">{txDigest}</div>
                      <a
                        href={getExplorerTxUrl(txDigest)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                      >
                        {messages.mint.openExplorer}
                      </a>
                    </div>
                  ) : null}

                  {mintedAssetId ? (
                    <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-3 text-center">
                      <div className="text-xs uppercase tracking-wider text-slate-400">Asset object ID</div>
                      <div className="mt-1 break-all font-mono text-xs text-cyan-100">{mintedAssetId}</div>
                      <a
                        href={getExplorerObjectUrl(mintedAssetId)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                      >
                        View wallet object
                      </a>
                    </div>
                  ) : null}

                  {offlineNote ? <p className="mt-4 text-center text-xs text-amber-100/90">{offlineNote}</p> : null}

                  <button
                    type="button"
                    className="mt-6 w-full rounded-xl border border-white/10 py-2 text-sm text-slate-300 hover:bg-white/5"
                    onClick={resetFlow}
                  >
                    {messages.swap.back}
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-5xl">
          <div className="rounded-[1.75rem] border border-violet-400/25 bg-gradient-to-br from-violet-950/50 via-slate-950 to-slate-950 p-6 shadow-[0_20px_70px_rgba(91,33,182,0.15)] ring-1 ring-violet-500/10 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/10">
                <Shield className="h-6 w-6 text-violet-200" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-white">{messages.mint.governanceTitle}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{messages.mint.governanceBlurb}</p>
                </div>
                <p className="text-xs text-slate-500">{messages.mint.governanceWalletHint}</p>

                {adminCaps.length > 0 ? (
                  <div className="rounded-xl border border-white/10 bg-[rgba(4,8,16,0.48)] p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Saved AdminCaps
                    </div>
                    <div className="space-y-2">
                      {adminCaps.map((cap) => (
                        <div key={`saved-${cap.id}-${cap.admin_cap_id}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAdminCapId(cap.admin_cap_id)}
                            className="min-w-0 text-left"
                          >
                            <div className="truncate text-sm font-semibold text-slate-200">{cap.label || 'AdminCap'}</div>
                            <div className="truncate font-mono text-[11px] text-slate-500">{cap.admin_cap_id}</div>
                          </button>
                          {cap.id !== 0 ? (
                            <button
                              type="button"
                              onClick={() => void handleDeleteAdminCap(cap)}
                              className="shrink-0 rounded-lg border border-rose-400/25 px-2 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/10"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
                  {messages.mint.newAdminAddressLabel}
                </label>
                <input
                  value={newAdminAddress}
                  onChange={(e) => setNewAdminAddress(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-white/10 bg-[rgba(5,9,18,0.72)] px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/25"
                  placeholder="0x…"
                />

                {adminError ? (
                  <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{adminError}</div>
                ) : null}

                {adminTxDigest ? (
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-50">
                    <p>{messages.mint.adminAuthorized}</p>
                    <p className="mt-2 break-all font-mono text-xs text-emerald-100/90">{adminTxDigest}</p>
                    <a
                      href={getExplorerTxUrl(adminTxDigest)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200"
                    >
                      {messages.mint.openExplorer}
                    </a>
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={adminBusy}
                  onClick={() => void handleAuthorizeAdmin()}
                  className="w-full rounded-2xl border border-violet-400/35 bg-gradient-to-r from-violet-900/80 via-violet-800/90 to-indigo-700 px-4 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_0_28px_rgba(167,139,250,0.25)] transition hover:shadow-[0_0_40px_rgba(167,139,250,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {adminBusy ? messages.mint.authorizeNewAdminBusy : messages.mint.authorizeNewAdmin}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-5xl">
          <div className="rounded-[1.75rem] border border-amber-400/25 bg-gradient-to-br from-amber-950/35 via-slate-950 to-slate-950 p-6 shadow-[0_20px_70px_rgba(217,119,6,0.12)] ring-1 ring-amber-500/10 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10">
                <Terminal className="h-6 w-6 text-amber-200" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-white">{messages.mint.deployRunbookTitle}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{messages.mint.deployRunbookBlurb}</p>
                </div>

                <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm leading-relaxed text-amber-50">
                  {messages.mint.deployRunbookWarning}
                </div>

                <ol className="space-y-2 text-sm leading-relaxed text-slate-300">
                  {messages.mint.deployRunbookChecklist.map((item, index) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10 text-[11px] font-semibold text-amber-100">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {messages.mint.deployRunbookCommandsLabel}
                    </div>
                    <div className="space-y-2">
                      {messages.mint.deployRunbookCommands.map((command) => (
                        <div key={command} className="overflow-x-auto rounded-xl border border-white/10 bg-[rgba(5,9,18,0.72)] px-3 py-2 font-mono text-xs text-cyan-100">
                          {command}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {messages.mint.deployRunbookEnvLabel}
                    </div>
                    <div className="space-y-2">
                      {messages.mint.deployRunbookEnvVars.map((envVar) => (
                        <div key={envVar} className="overflow-x-auto rounded-xl border border-white/10 bg-[rgba(5,9,18,0.72)] px-3 py-2 font-mono text-xs text-violet-100">
                          {envVar}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {flowPhase === 'running' ? (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(5,9,18,0.75)] backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="pointer-events-none absolute inset-y-[-20%] left-0 w-[55vw] max-w-2xl bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent blur-2xl"
              initial={{ x: '-60%' }}
              animate={{ x: '160%' }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
            />
            <div className="relative z-10 px-6 text-center">
              <motion.p
                key={phaseLabel}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-medium tracking-tight text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]"
              >
                {phaseLabel}
              </motion.p>
              <p className="mt-3 text-xs uppercase tracking-[0.35em] text-slate-500">Cyber-Elegance digitization</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
