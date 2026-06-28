import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from '@creit.tech/stellar-wallets-kit';
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

export function WalletProvider({ children }: { children: ReactNode }) {
  const kitRef = useRef<StellarWalletsKit | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  if (!kitRef.current) {
    kitRef.current = new StellarWalletsKit({
      network: NETWORK === 'public' ? WalletNetwork.PUBLIC : WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }

  useEffect(() => {
    setAnalyticsWallet(address);
  }, [address]);

  // Restore a previous session.
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    const kit = kitRef.current;
    if (!savedId || !kit) return;
    kit.setWallet(savedId);
    kit
      .getAddress()
      .then(({ address: restored }) => setAddress(restored))
      .catch(() => localStorage.removeItem(STORAGE_KEY));
  }, []);

  const connect = useCallback(async () => {
    const kit = kitRef.current;
    if (!kit) return;
    setConnecting(true);
    try {
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
    void kitRef.current?.disconnect().catch(() => undefined);
  }, []);

  const signer = useMemo<WalletSigner | null>(() => {
    const kit = kitRef.current;
    if (!address || !kit) return null;
    return {
      publicKey: address,
      signTransaction: async (xdr, opts) => {
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
