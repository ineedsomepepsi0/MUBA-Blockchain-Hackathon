import { useState, useEffect, useRef } from 'react';
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import './App.css';

// ─── CONFIG ────────────────────────────────────────────────────────────────
const PACKAGE_ID = 'PASTE_YOUR_PACKAGE_ID_HERE';
const COIN_TYPE = '0x2::sui::SUI';
const MIST_PER_SUI = 1_000_000_000;

function truncateAddr(addr: string): string {
  if (!addr) return '';
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-6)}` : addr;
}

function formatTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export default function App() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [escrowId, setEscrowId] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [log, setLog] = useState<{ time: string; msg: string; type: 'info' | 'success' | 'error' }[]>(
    []
  );
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLog((prev) => [{ time: formatTime(), msg, type }, ...prev]);
  };

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [log]);

  async function createEscrow() {
    if (!account) return addLog('Connect a wallet first.', 'error');
    if (PACKAGE_ID.startsWith('PASTE')) return addLog('Set PACKAGE_ID in App.tsx first.', 'error');
    if (!recipient) return addLog('Enter a recipient address.', 'error');
    if (!amount || Number(amount) <= 0) return addLog('Enter a valid amount.', 'error');

    setIsLoading(true);
    try {
      const mist = Math.floor(Number(amount) * MIST_PER_SUI);
      if (mist <= 0) throw new Error('Amount too small (min 0.000000001 SUI)');

      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [mist]);
      tx.moveCall({
        target: `${PACKAGE_ID}::payment_escrow::create_escrow`,
        typeArguments: [COIN_TYPE],
        arguments: [coin, tx.pure.address(recipient)],
      });

      const result = await signAndExecute({ transaction: tx });
      addLog(`Transaction sent: ${result.digest}`, 'info');

      const full = await client.waitForTransaction({
        digest: result.digest,
        options: { showObjectChanges: true },
      });

      const created = full.objectChanges?.find(
        (c) => c.type === 'created' && c.objectType.includes('Escrow')
      );
      if (created && 'objectId' in created) {
        setEscrowId(created.objectId);
        addLog(`✅ Escrow created: ${created.objectId}`, 'success');
      } else {
        addLog(`⚠️ Tx succeeded but no Escrow object found. Check explorer.`, 'error');
      }
    } catch (err) {
      addLog(`❌ Create failed: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function callEscrow(fn: 'release' | 'cancel') {
    if (!account) return addLog('Connect a wallet first.', 'error');
    if (!releaseId) return addLog('Paste an Escrow object ID.', 'error');

    setIsLoading(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::payment_escrow::${fn}`,
        typeArguments: [COIN_TYPE],
        arguments: [tx.object(releaseId)],
      });

      const result = await signAndExecute({ transaction: tx });
      addLog(`✅ ${fn} succeeded: ${result.digest}`, 'success');
      setReleaseId('');
    } catch (err) {
      addLog(`❌ ${fn} failed: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          ⚡ Payment Escrow
          <span>testnet</span>
        </h1>
        <div className="wallet-connect-wrap">
          {account && (
            <span className="connected-badge" title={account.address}>
              {truncateAddr(account.address)}
            </span>
          )}
          <ConnectButton className="connect-button" />
        </div>
      </header>

      <section className="card">
        <div className="card-title">
          <span className="dot" />
          Lock a payment
        </div>
        <div className="input-group">
          <label>Recipient address</label>
          <input
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="input-group">
          <label>Amount (SUI)</label>
          <input
            placeholder="e.g. 0.5"
            type="number"
            min="0.000000001"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={createEscrow}
          disabled={isLoading || !account}
        >
          {isLoading ? 'Processing…' : '🔒 Lock funds'}
        </button>

        {escrowId && (
          <div className="escrow-id-box">
            <span className="label">Escrow ID</span>
            <span className="id">{escrowId}</span>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(escrowId);
                addLog('📋 Escrow ID copied to clipboard.', 'info');
              }}
              style={{ marginLeft: 'auto' }}
            >
              Copy
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-title">
          <span className="dot" style={{ background: '#2d8f5e' }} />
          Release or cancel
        </div>
        <div className="input-group">
          <label>Escrow object ID</label>
          <input
            placeholder="Paste the Escrow ID from above"
            value={releaseId}
            onChange={(e) => setReleaseId(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="btn-group">
          <button
            className="btn btn-success"
            onClick={() => callEscrow('release')}
            disabled={isLoading || !account}
          >
            {isLoading ? '…' : '✅ Release (as recipient)'}
          </button>
          <button
            className="btn btn-danger"
            onClick={() => callEscrow('cancel')}
            disabled={isLoading || !account}
          >
            {isLoading ? '…' : '⛔ Cancel (as sender)'}
          </button>
        </div>
        <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: '#475569' }}>
          <span>💡 Recipient → Release &nbsp;·&nbsp; Sender → Cancel</span>
        </div>
      </section>

      <section className="card log-section">
        <div className="card-title">
          <span className="dot" style={{ background: '#94a3b8' }} />
          Activity log
        </div>
        <ul className="log-list">
          {log.length === 0 ? (
            <li className="log-empty">No activity yet — start by locking funds.</li>
          ) : (
            log.map((entry, i) => (
              <li key={i}>
                <span className="log-time">{entry.time}</span>
                <span className={`log-msg ${entry.type}`}>{entry.msg}</span>
              </li>
            ))
          )}
          <div ref={logEndRef} />
        </ul>
      </section>

      <div style={{ fontSize: '0.7rem', color: '#334155', textAlign: 'center', marginTop: '1rem' }}>
        Built for Sui Track 01 · Payments &amp; Stablecoins · {PACKAGE_ID.startsWith('PASTE') ? '⚠️ Set PACKAGE_ID' : '✅ Ready'}
      </div>
    </div>
  );
}