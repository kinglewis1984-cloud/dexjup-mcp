import { Connection, LAMPORTS_PER_SOL, PublicKey, type SignatureStatus, VersionedTransaction } from "@solana/web3.js";

export interface TokenBalance {
  amount: string;
  decimals: number;
  uiAmount: number | null;
}

export class SolanaRpcClient {
  readonly connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  async getSolBalance(address: string): Promise<number> {
    const lamports = await this.connection.getBalance(new PublicKey(address));
    return lamports / LAMPORTS_PER_SOL;
  }

  async getTokenBalance(ownerAddress: string, mintAddress: string): Promise<TokenBalance> {
    const owner = new PublicKey(ownerAddress);
    const mint = new PublicKey(mintAddress);
    const accounts = await this.connection.getParsedTokenAccountsByOwner(owner, { mint });
    if (accounts.value.length === 0) {
      return { amount: "0", decimals: 0, uiAmount: 0 };
    }
    const info = accounts.value[0].account.data.parsed.info.tokenAmount as TokenBalance;
    return info;
  }

  async getSignatureStatus(signature: string): Promise<SignatureStatus | null> {
    const res = await this.connection.getSignatureStatuses([signature]);
    return res.value[0] ?? null;
  }

  async sendRawTransaction(rawTx: Uint8Array): Promise<string> {
    return this.connection.sendRawTransaction(rawTx, { skipPreflight: false, maxRetries: 3 });
  }

  static deserializeTransaction(base64Tx: string): VersionedTransaction {
    return VersionedTransaction.deserialize(Buffer.from(base64Tx, "base64"));
  }
}
