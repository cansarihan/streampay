import {
  Account,
  BASE_FEE,
  Contract,
  Keypair,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import type {
  CancelResult,
  Config,
  CreateStreamParams,
  Stream,
  StreamPayClientConfig,
  WalletSigner,
} from './types';
import { parseConfig, parseStream, toAddress, toBool, toI128, toU64 } from './scval';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Typed client for the StreamPay contract. Read methods use simulation only (no signing); write
 * methods build, prepare, sign (via a wallet) and submit a Soroban transaction, then poll for the
 * result. The same client works in the browser (with a wallet signer) and in Node (reads only).
 */
export class StreamPayClient {
  readonly contractId: string;
  readonly networkPassphrase: string;
  readonly rpcUrl: string;
  private readonly server: rpc.Server;
  private readonly contract: Contract;
  private readonly baseFee: string;
  private readonly readSource: string;

  constructor(config: StreamPayClientConfig) {
    this.contractId = config.contractId;
    this.networkPassphrase = config.networkPassphrase;
    this.rpcUrl = config.rpcUrl;
    this.server = new rpc.Server(config.rpcUrl, {
      allowHttp: config.rpcUrl.startsWith('http://'),
    });
    this.contract = new Contract(config.contractId);
    this.baseFee = config.baseFee ?? BASE_FEE;
    // A throwaway source account is enough for read-only simulation.
    this.readSource = Keypair.random().publicKey();
  }

  // --- reads (simulation only) -----------------------------------------------------------------

  private async simulate(method: string, args: xdr.ScVal[]): Promise<unknown> {
    const source = new Account(this.readSource, '0');
    const tx = new TransactionBuilder(source, {
      fee: this.baseFee,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation of ${method} failed: ${sim.error}`);
    }
    const retval = sim.result?.retval;
    return retval ? scValToNative(retval) : null;
  }

  async getStream(id: number): Promise<Stream> {
    return parseStream((await this.simulate('get_stream', [toU64(id)])) as never);
  }

  async streamedAmount(id: number): Promise<bigint> {
    return BigInt((await this.simulate('streamed_amount', [toU64(id)])) as bigint);
  }

  async withdrawableAmount(id: number): Promise<bigint> {
    return BigInt((await this.simulate('withdrawable_amount', [toU64(id)])) as bigint);
  }

  async totalStreams(): Promise<number> {
    return Number((await this.simulate('total_streams', [])) as bigint);
  }

  async getConfig(): Promise<Config> {
    return parseConfig((await this.simulate('get_config', [])) as never);
  }

  async getStreamsBySender(address: string): Promise<number[]> {
    const ids = (await this.simulate('get_streams_by_sender', [toAddress(address)])) as Array<
      bigint | number
    > | null;
    return (ids ?? []).map(Number);
  }

  async getStreamsByRecipient(address: string): Promise<number[]> {
    const ids = (await this.simulate('get_streams_by_recipient', [toAddress(address)])) as Array<
      bigint | number
    > | null;
    return (ids ?? []).map(Number);
  }

  /** Resolve the full Stream objects a sender has opened. */
  async listBySender(address: string): Promise<Stream[]> {
    const ids = await this.getStreamsBySender(address);
    return Promise.all(ids.map((id) => this.getStream(id)));
  }

  /** Resolve the full Stream objects pointed at a recipient. */
  async listByRecipient(address: string): Promise<Stream[]> {
    const ids = await this.getStreamsByRecipient(address);
    return Promise.all(ids.map((id) => this.getStream(id)));
  }

  // --- writes (wallet-signed) ------------------------------------------------------------------

  private async invoke(
    method: string,
    args: xdr.ScVal[],
    signer: WalletSigner
  ): Promise<xdr.ScVal | undefined> {
    const account = await this.server.getAccount(signer.publicKey);
    const built = new TransactionBuilder(account, {
      fee: this.baseFee,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(180)
      .build();

    const prepared = await this.server.prepareTransaction(built);
    const signed = await signer.signTransaction(prepared.toXDR(), {
      networkPassphrase: this.networkPassphrase,
      address: signer.publicKey,
    });
    const signedXdr = typeof signed === 'string' ? signed : signed.signedTxXdr;
    const signedTx = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);

    const sent = await this.server.sendTransaction(signedTx);
    if (sent.status === 'ERROR') {
      throw new Error(`Transaction rejected by RPC: ${JSON.stringify(sent.errorResult)}`);
    }

    let result = await this.server.getTransaction(sent.hash);
    const deadline = Date.now() + 30_000;
    while (
      result.status === rpc.Api.GetTransactionStatus.NOT_FOUND &&
      Date.now() < deadline
    ) {
      await sleep(1000);
      result = await this.server.getTransaction(sent.hash);
    }

    if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(`Transaction ${sent.hash} did not succeed (status: ${result.status})`);
    }
    return result.returnValue;
  }

  /** Open a stream; returns the new stream id. */
  async createStream(params: CreateStreamParams, signer: WalletSigner): Promise<number> {
    const ret = await this.invoke(
      'create_stream',
      [
        toAddress(params.sender),
        toAddress(params.recipient),
        toAddress(params.token),
        toI128(params.deposit),
        toU64(params.startTime),
        toU64(params.cliffTime),
        toU64(params.endTime),
        toBool(params.cancelable),
      ],
      signer
    );
    return ret ? Number(scValToNative(ret)) : -1;
  }

  /** Withdraw a specific amount of accrued funds; returns the net received by the recipient. */
  async withdraw(streamId: number, amount: bigint, signer: WalletSigner): Promise<bigint> {
    const ret = await this.invoke('withdraw', [toU64(streamId), toI128(amount)], signer);
    return ret ? BigInt(scValToNative(ret)) : 0n;
  }

  /** Withdraw the entire currently-available balance. */
  async withdrawMax(streamId: number, signer: WalletSigner): Promise<bigint> {
    const ret = await this.invoke('withdraw_max', [toU64(streamId)], signer);
    return ret ? BigInt(scValToNative(ret)) : 0n;
  }

  /** Cancel a cancelable stream; returns the recipient payout and the sender refund. */
  async cancel(streamId: number, signer: WalletSigner): Promise<CancelResult> {
    const ret = await this.invoke('cancel', [toU64(streamId)], signer);
    const tuple = (ret ? scValToNative(ret) : [0n, 0n]) as [bigint, bigint];
    return { recipientAmount: BigInt(tuple[0] ?? 0n), refund: BigInt(tuple[1] ?? 0n) };
  }

  /** Direct access to the underlying Soroban RPC server (used by the indexer for getEvents). */
  get rpcServer(): rpc.Server {
    return this.server;
  }
}
