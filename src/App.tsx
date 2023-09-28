import './App.css';
import * as solana from "@solana/web3.js";
import { sendAndConfirmTransaction, Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { useEffect, useState } from "react";

import * as buffer from "buffer";
window.Buffer = buffer.Buffer;

type DisplayEncoding = "utf8" | "hex";

// Define the PhantomProvider interface
interface PhantomProvider {
  publicKey: solana.PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (message: Uint8Array | string, display?: DisplayEncoding) => Promise<any>;
  connect: () => Promise<{ publicKey: solana.PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: "disconnect" | "connect" | "accountChanged", handler: (args: any) => void) => void;
  request: (method: "connect" | "disconnect" | "signTransaction" | "signAllTransactions" | "signMessage", params: any) => Promise<unknown>;
}

const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

function App() {
  const [provider, setProvider] = useState<PhantomProvider | undefined>(undefined);
  const [receiverPublicKey, setReceiverPublicKey] = useState<solana.PublicKey | undefined>(undefined);
  const [senderKeypair, setSenderKeypair] = useState<Keypair | undefined>(undefined);
  const connection = new solana.Connection('http://127.0.0.1:8899', 'confirmed');

  useEffect(() => {
    const provider = getProvider();
    if (provider) setProvider(provider);
  }, []);

  const createSender = async () => {
    try {
      const amountToSend = 2;
      const newSenderKeypair = Keypair.generate();
      console.log('Sender account:', newSenderKeypair.publicKey.toString());
      console.log(`Airdropping ${amountToSend} SOL to Sender Wallet`);
      const airdropSignature = await connection.requestAirdrop(newSenderKeypair.publicKey, LAMPORTS_PER_SOL * amountToSend);
      await connection.confirmTransaction(airdropSignature);
      console.log(`Wallet Balance: ${(await connection.getBalance(newSenderKeypair.publicKey)) / LAMPORTS_PER_SOL}`);
      setSenderKeypair(newSenderKeypair);
    } catch (error) {
      console.error('Error creating account and airdrop:', error);
    }
  }

  const connectWallet = async () => {
    if (provider) {
      try {
        const connected = await provider.connect();
        if (connected) {
          const wallet = new Keypair();
          setReceiverPublicKey(wallet.publicKey);
        }
      } catch (err) {
        console.log(err);
      }
    }
  };

  const disconnectWallet = async () => {
    if (provider) {
      try {
        await provider.disconnect();
        setReceiverPublicKey(undefined);
        console.log("Wallet disconnected");
      } catch (err) {
        console.log(err);
      }
    }
  };

  const transferSol = async () => {
    try {
      if (!senderKeypair || !receiverPublicKey) {
        console.error("Sender Keypair or Receiver Public Key not available");
        return;
      }

      // Create a new transaction for the transfer
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: receiverPublicKey,
          lamports: LAMPORTS_PER_SOL * 1,
        }),
      );

      // Sign the transaction using the sender's Keypair
      const signature = await sendAndConfirmTransaction(connection, transaction, [senderKeypair]);

      // Wait for the transaction to confirm
      await connection.confirmTransaction(signature);

      console.log(`Receiver Balance: ${await connection.getBalance(receiverPublicKey) / LAMPORTS_PER_SOL}`);
      console.log(`Sender Balance: ${await connection.getBalance(senderKeypair.publicKey) / LAMPORTS_PER_SOL}`);
    } catch (err) {
      console.log("Error transferring SOL.");
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>Module 2 Assessment</h2>
        <span className="buttons">
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={createSender}
          >
            Create a New Solana Account
          </button>
          {provider && !receiverPublicKey && (
            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
              }}
              onClick={connectWallet}
            >
              Connect to Phantom Wallet
            </button>
          )}
          {provider && receiverPublicKey && (
            <div>
              <button
                style={{
                  fontSize: "16px",
                  padding: "15px",
                  fontWeight: "bold",
                  borderRadius: "5px",
                  position: "absolute",
                  top: "28px",
                  right: "28px"
                }}
                onClick={disconnectWallet}
              >
                Disconnect from Wallet
              </button>
            </div>
          )}
          {provider && receiverPublicKey && senderKeypair && (
            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
              }}
              onClick={transferSol}
            >
              Transfer SOL to Phantom Wallet
            </button>
          )}
        </span>
        {!provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}
      </header>
    </div>
  );
}

export default App;
