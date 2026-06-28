import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { StellarWalletsKit, WalletNetwork } from '@creit.tech/stellar-wallets-kit';
import type { WalletSigner } from '@streampay/sdk';
import { NETWORK, NETWORK_PASSPHRASE } from './config';
import { setAnalyticsWallet, track } from './analytics';

interface WalletContextValue {
  address: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signer: WalletSigner | null;
}

const WalletContext = createContext<WalletContextValue | null>(null);
const STORAGE_KEY = 'streampay:wallet';

// The wallets kit is ~1 MB (it bundles many wallet integrations), so it is dynamically imported and
// instantiated only the first time it is actually needed — never on the landing/initial load.
let kitPromise: Promise<StellarWalletsKit> | null = null;
function getKit(): Promise<StellarWalletsKit> {
  if (!kitPromise) {
    kitPromise = import('@creit.tech/stellar-wallets-kit').then(
      (m) =>
        new m.StellarWalletsKit({
          network: NETWORK === 'public' ? m.WalletNetwork.PUBLIC : m.WalletNetwork.TESTNET,
          selectedWalletId: m.FREIGHTER_ID,
          modules: [
            new m.FreighterModule(),
            new m.xBullModule(),
            new m.AlbedoModule(),
            new m.LobstrModule(),
            new m.RabetModule(),
            new m.HanaModule(),
            new m.HotWalletModule(),
          ],
        })
    );
  }
  return kitPromise;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    setAnalyticsWallet(address);
  }, [address]);

  // Restore a previous session (only loads the kit if there is one to restore).
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) return;
    void getKit().then(async (kit) => {
      kit.setWallet(savedId);
      try {
        const { address: restored } = await kit.getAddress();
        setAddress(restored);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    });
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const kit = await getKit();
      await kit.openModal({
        onWalletSelected: async (option) => {
          kit.setWallet(option.id);
          const { address: selected } = await kit.getAddress();
          localStorage.setItem(STORAGE_KEY, option.id);
          setAddress(selected);
          track('wallet_connected', { wallet: option.id });
        },
      });
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAddress(null);
    track('wallet_disconnected');
    void getKit().then((kit) => kit.disconnect().catch(() => undefined));
  }, []);

  const signer = useMemo<WalletSigner | null>(() => {
    if (!address) return null;
    return {
      publicKey: address,
      signTransaction: async (xdr, opts) => {
        const kit = await getKit();
        const { signedTxXdr } = await kit.signTransaction(xdr, {
          address,
          networkPassphrase: (opts?.networkPassphrase ?? NETWORK_PASSPHRASE) as WalletNetwork,
        });
        return { signedTxXdr };
      },
    };
  }, [address]);

  const value = useMemo(
    () => ({ address, connecting, connect, disconnect, signer }),
    [address, connecting, connect, disconnect, signer]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
