import React, { useRef, useState } from 'react';
import { EncryptedVault, SideNoteBookStorage } from '@/types';
import { cryptoService } from '@/services/cryptoService';
import { driveSyncService } from '@/services/driveSyncService';
import { storageService } from '@/services/storageService';

interface CloudSyncPanelProps {
  state: SideNoteBookStorage;
  onStatusMessage: (msg: string) => void;
}

export function CloudSyncPanel({
  state,
  onStatusMessage,
}: CloudSyncPanelProps) {
  const { cloudSync } = state;

  const [customClientId, setCustomClientId] = useState(
    cloudSync.customClientId || ''
  );
  const [encryptionMode, setEncryptionMode] = useState<'email' | 'passphrase'>(
    cloudSync.encryptionMode || 'email'
  );
  const [passphrase, setPassphrase] = useState('');
  const [localTestEmail, setLocalTestEmail] = useState(
    cloudSync.email || 'researcher@gmail.com'
  );
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const vaultFileInputRef = useRef<HTMLInputElement | null>(null);

  const redirectUrl = driveSyncService.getRedirectUrl();

  const handleSaveClientId = async () => {
    await storageService.setState((prev) => ({
      ...prev,
      cloudSync: {
        ...prev.cloudSync,
        customClientId: customClientId.trim(),
        encryptionMode,
      },
    }));
    onStatusMessage('Saved Google OAuth Client ID & encryption settings');
  };

  const handleConnect = async () => {
    setBusy('connect');
    setError(null);
    try {
      const profile = await driveSyncService.connectGmail(customClientId);
      setLocalTestEmail(profile.email);
      onStatusMessage(`Connected Gmail: ${profile.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const handlePushToDrive = async () => {
    setBusy('push');
    setError(null);
    try {
      const res = await driveSyncService.pushToDrive({
        passphrase,
        mode: encryptionMode,
        customClientId,
      });
      onStatusMessage(
        `Encrypted & synced to Google Drive (${res.email})`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleExtractFromDrive = async () => {
    setBusy('pull');
    setError(null);
    try {
      const res = await driveSyncService.extractFromDrive({
        passphrase,
        customClientId,
      });
      onStatusMessage(
        `Extracted ${res.notesCount} note(s) & ${res.foldersCount} folder(s) for ${res.email}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async () => {
    setBusy('disconnect');
    setError(null);
    try {
      await driveSyncService.disconnectGmail();
      onStatusMessage('Disconnected Gmail account');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadLocalEncryptedVault = async () => {
    setError(null);
    try {
      const email = cloudSync.email || localTestEmail.trim();
      if (!email) {
        setError('Enter an email address to bind the encrypted vault.');
        return;
      }
      const vault = await cryptoService.encryptVault(
        {
          notes: state.notes,
          tabFolders: state.tabFolders,
          exportedAt: Date.now(),
        },
        {
          mode: encryptionMode,
          email,
          userId: cloudSync.userId || email,
          passphrase,
        }
      );

      const blob = new Blob([JSON.stringify(vault, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sidenotebook.vault.enc';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      onStatusMessage(
        `Exported AES-256-GCM encrypted vault for ${email}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleImportLocalEncryptedVault = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const raw = await file.text();
      const vault = JSON.parse(raw) as EncryptedVault;
      const email = cloudSync.email || localTestEmail.trim();
      const decrypted = await cryptoService.decryptVault(vault, {
        email,
        userId: cloudSync.userId || email,
        passphrase,
      });

      await storageService.setState((prev) => {
        const existingNotes = new Map(prev.notes.map((n) => [n.id, n]));
        for (const n of decrypted.notes || []) {
          const cur = existingNotes.get(n.id);
          if (!cur || n.updatedAt > cur.updatedAt) existingNotes.set(n.id, n);
        }
        const existingFolders = new Map(
          prev.tabFolders.map((f) => [f.id, f])
        );
        for (const f of decrypted.tabFolders || []) {
          const cur = existingFolders.get(f.id);
          if (!cur || f.updatedAt > cur.updatedAt)
            existingFolders.set(f.id, f);
        }
        return {
          ...prev,
          notes: Array.from(existingNotes.values()),
          tabFolders: Array.from(existingFolders.values()),
        };
      });

      onStatusMessage(
        `Decrypted & extracted ${decrypted.notes.length} note(s) and ${decrypted.tabFolders.length} folder(s)`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
      {/* Gmail Account Card */}
      <div className="p-3 rounded-md bg-slate-900 border border-slate-800 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-bold text-slate-100 flex items-center gap-1.5">
              <span>☁</span>
              <span>Serverless Gmail & Drive Sync</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Stores an encrypted vault (<code>sidenotebook.vault.enc</code>)
              directly in your Google Drive — zero external servers needed.
            </p>
          </div>
          {cloudSync.email && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold shrink-0">
              Connected
            </span>
          )}
        </div>

        {cloudSync.email ? (
          <div className="p-2 rounded bg-slate-950/70 border border-slate-800 space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Gmail:</span>
              <span className="font-semibold text-amber-300">
                {cloudSync.email}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Last Synced:</span>
              <span className="text-slate-300">
                {cloudSync.lastSyncedAt
                  ? new Date(cloudSync.lastSyncedAt).toLocaleString()
                  : 'Not synced yet'}
              </span>
            </div>
          </div>
        ) : null}

        {/* Encryption Mode Selector */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-[11px] font-semibold text-slate-300">
            Encryption Key Mode (AES-256-GCM)
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setEncryptionMode('email')}
              className={`p-2 rounded border text-left transition ${
                encryptionMode === 'email'
                  ? 'bg-slate-800 border-amber-400 text-slate-100'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-[11px]">
                Auto by Gmail
              </div>
              <div className="text-[10px] opacity-75">
                Auto-extracts on sign-in
              </div>
            </button>

            <button
              type="button"
              onClick={() => setEncryptionMode('passphrase')}
              className={`p-2 rounded border text-left transition ${
                encryptionMode === 'passphrase'
                  ? 'bg-slate-800 border-amber-400 text-slate-100'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-[11px]">
                Master Passphrase
              </div>
              <div className="text-[10px] opacity-75">
                Zero-knowledge lock
              </div>
            </button>
          </div>

          {encryptionMode === 'passphrase' && (
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter Master Passphrase..."
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          )}
        </div>

        {/* Google Drive Sync Actions */}
        <div className="space-y-1.5 pt-1">
          {!cloudSync.email ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={handleConnect}
              className="w-full py-2 px-3 rounded bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold transition"
            >
              {busy === 'connect'
                ? 'Connecting to Gmail...'
                : 'Sign In with Gmail'}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={busy !== null}
                onClick={handlePushToDrive}
                className="py-2 px-2.5 rounded bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-[11.5px] transition"
              >
                {busy === 'push' ? 'Encrypting...' : '⬆ Sync to Drive'}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={handleExtractFromDrive}
                className="py-2 px-2.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-slate-100 font-semibold text-[11.5px] transition"
              >
                {busy === 'pull' ? 'Extracting...' : '⬇ Extract Notes'}
              </button>
            </div>
          )}

          {cloudSync.email && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={handleDisconnect}
              className="w-full py-1 text-[11px] text-slate-400 hover:text-red-400 transition"
            >
              Disconnect Gmail ({cloudSync.email})
            </button>
          )}
        </div>

        {error && (
          <div className="p-2 rounded bg-red-500/15 border border-red-500/40 text-red-300 text-[11px] leading-relaxed">
            {error}
          </div>
        )}
      </div>

      {/* Google OAuth Client ID Setup */}
      <div className="p-3 rounded-md bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200">
            Google OAuth Client ID
          </span>
          <button
            type="button"
            onClick={() => setShowSetupGuide((v) => !v)}
            className="text-[11px] text-amber-300 underline"
          >
            {showSetupGuide ? 'Hide Guide' : 'Setup Guide'}
          </button>
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={customClientId}
            onChange={(e) => setCustomClientId(e.target.value)}
            placeholder="xxxx.apps.googleusercontent.com"
            className="flex-1 px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-[11px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="button"
            onClick={handleSaveClientId}
            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold"
          >
            Save
          </button>
        </div>

        {showSetupGuide && (
          <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
            <div className="font-semibold text-amber-300">
              Free Serverless Setup (Google Cloud Console):
            </div>
            <ol className="list-decimal pl-4 space-y-1">
              <li>
                Create a free project in Google Cloud Console & enable the{' '}
                <strong>Google Drive API</strong>.
              </li>
              <li>
                Under <strong>OAuth consent screen</strong>, add your Gmail as
                a Test User and add scopes <code>userinfo.email</code> &{' '}
                <code>drive.file</code>.
              </li>
              <li>
                Create an <strong>OAuth 2.0 Client ID</strong> (Web Application)
                and add this Authorized Redirect URI:
              </li>
            </ol>
            {redirectUrl && (
              <div className="flex items-center gap-1 pt-0.5">
                <code className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] truncate text-amber-200">
                  {redirectUrl}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(redirectUrl);
                    onStatusMessage('Copied Chrome Redirect URI');
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Offline Encrypted Vault Test (.vault.enc) */}
      <div className="p-3 rounded-md bg-slate-900 border border-slate-800 space-y-2">
        <div className="font-bold text-slate-200">
          Offline Encrypted Vault Verification (`.vault.enc`)
        </div>
        <p className="text-[11px] text-slate-400">
          Test AES-256-GCM encryption & email-bound extraction locally right now
          without needing Google Cloud credentials.
        </p>

        <input
          type="email"
          value={cloudSync.email || localTestEmail}
          disabled={Boolean(cloudSync.email)}
          onChange={(e) => setLocalTestEmail(e.target.value)}
          placeholder="Gmail address for vault key..."
          className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-[11px] text-slate-100 disabled:opacity-60 focus:outline-none focus:border-amber-400"
        />

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={handleDownloadLocalEncryptedVault}
            className="py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold"
          >
            🔒 Export .vault.enc
          </button>

          <input
            ref={vaultFileInputRef}
            type="file"
            accept=".enc,.json"
            onChange={handleImportLocalEncryptedVault}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => vaultFileInputRef.current?.click()}
            className="py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold"
          >
            🔓 Decrypt .vault.enc
          </button>
        </div>
      </div>
    </div>
  );
}
