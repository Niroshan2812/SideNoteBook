import { cryptoService, VaultPayload } from '@/services/cryptoService';
import { storageService } from '@/services/storageService';
import { EncryptedVault, Note, TabFolder } from '@/types';

const DRIVE_FOLDER_NAME = 'SideNoteBook';
const VAULT_FILE_NAME = 'sidenotebook.vault.enc';
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.file',
];

interface GoogleUserProfile {
  email: string;
  id: string;
}

let cachedWebFlowToken: { token: string; expiresAt: number } | null = null;

function mergeByUpdatedAt<T extends { id: string; updatedAt: number }>(
  localItems: T[],
  remoteItems: T[]
): T[] {
  const map = new Map<string, T>();
  for (const item of localItems) {
    map.set(item.id, item);
  }
  for (const remote of remoteItems) {
    const existing = map.get(remote.id);
    if (!existing || remote.updatedAt > existing.updatedAt) {
      map.set(remote.id, remote);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

async function getAccessToken(customClientId?: string): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.identity) {
    throw new Error('Chrome Identity API is unavailable in this context.');
  }

  // Path 1: Custom Web OAuth Client ID via launchWebAuthFlow (works on unpacked extensions across any PC)
  if (customClientId && customClientId.trim()) {
    if (cachedWebFlowToken && Date.now() < cachedWebFlowToken.expiresAt) {
      return cachedWebFlowToken.token;
    }

    const redirectUri = chrome.identity.getRedirectURL();
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', customClientId.trim());
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', OAUTH_SCOPES.join(' '));
    authUrl.searchParams.set('prompt', 'consent');

    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    });

    if (!responseUrl) {
      throw new Error('Google sign-in was cancelled.');
    }

    const hashParams = new URLSearchParams(
      new URL(responseUrl).hash.replace(/^#/, '')
    );
    const accessToken = hashParams.get('access_token');
    const expiresIn = parseInt(hashParams.get('expires_in') || '3500', 10);

    if (!accessToken) {
      throw new Error('No access token returned by Google OAuth.');
    }

    cachedWebFlowToken = {
      token: accessToken,
      expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
    };
    return accessToken;
  }

  // Path 2: Native chrome.identity.getAuthToken (uses oauth2.client_id in manifest.json)
  const manifest = chrome.runtime.getManifest();
  const manifestClientId = manifest.oauth2?.client_id || '';
  if (!manifestClientId || manifestClientId.startsWith('YOUR_GOOGLE_OAUTH')) {
    throw new Error(
      'Google OAuth Client ID is not configured yet. Paste your OAuth Client ID in Cloud Sync Settings (or set oauth2.client_id in manifest.json).'
    );
  }

  return new Promise<string>((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(
          new Error(
            chrome.runtime.lastError?.message ||
              'Failed to authenticate with Gmail.'
          )
        );
        return;
      }
      resolve(token);
    });
  });
}

async function fetchGoogleProfile(token: string): Promise<GoogleUserProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Gmail profile (${res.status}).`);
  }
  const data = (await res.json()) as { email?: string; id?: string };
  if (!data.email) {
    throw new Error('Google profile did not return an email address.');
  }
  return { email: data.email, id: data.id || data.email };
}

async function findOrCreateDriveFolder(token: string): Promise<string> {
  const q = encodeURIComponent(
    `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!searchRes.ok) {
    throw new Error(`Google Drive search failed (${searchRes.status}).`);
  }
  const searchData = (await searchRes.json()) as {
    files?: { id: string; name: string }[];
  };

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Could not create Drive folder (${createRes.status}).`);
  }
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

async function findVaultFileId(
  token: string,
  folderId: string
): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${VAULT_FILE_NAME}' and '${folderId}' in parents and trashed=false`
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { files?: { id: string }[] };
  return data.files?.[0]?.id ?? null;
}

async function uploadEncryptedFile(
  token: string,
  folderId: string,
  existingFileId: string | null,
  vault: EncryptedVault
): Promise<string> {
  const metadata = existingFileId
    ? { name: VAULT_FILE_NAME }
    : { name: VAULT_FILE_NAME, parents: [folderId] };

  const boundary = 'sidenotebook_multipart_boundary';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    JSON.stringify(vault),
    `--${boundary}--`,
  ].join('\r\n');

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const res = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Google Drive upload failed (${res.status}): ${errText}`);
  }

  const saved = (await res.json()) as { id: string };
  return saved.id;
}

export const driveSyncService = {
  getRedirectUrl(): string {
    if (typeof chrome !== 'undefined' && chrome.identity?.getRedirectURL) {
      return chrome.identity.getRedirectURL();
    }
    return '';
  },

  async connectGmail(customClientId?: string): Promise<GoogleUserProfile> {
    const token = await getAccessToken(customClientId);
    const profile = await fetchGoogleProfile(token);

    await storageService.setState((prev) => ({
      ...prev,
      cloudSync: {
        ...prev.cloudSync,
        email: profile.email,
        userId: profile.id,
        customClientId: customClientId?.trim() || prev.cloudSync.customClientId,
        encryptionEnabled: true,
      },
    }));

    return profile;
  },

  async disconnectGmail(): Promise<void> {
    if (cachedWebFlowToken && typeof chrome !== 'undefined' && chrome.identity) {
      cachedWebFlowToken = null;
    } else if (typeof chrome !== 'undefined' && chrome.identity) {
      await new Promise<void>((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (token) {
            chrome.identity.removeCachedAuthToken({ token }, () => resolve());
          } else {
            resolve();
          }
        });
      });
    }

    await storageService.setState((prev) => ({
      ...prev,
      cloudSync: {
        ...prev.cloudSync,
        email: undefined,
        userId: undefined,
        driveFileId: undefined,
        lastSyncedAt: undefined,
      },
    }));
  },

  async pushToDrive(opts?: {
    passphrase?: string;
    mode?: 'email' | 'passphrase';
    customClientId?: string;
  }): Promise<{ email: string; fileId: string; syncedAt: number }> {
    const state = await storageService.getState();
    const clientId = opts?.customClientId ?? state.cloudSync.customClientId;
    const token = await getAccessToken(clientId);
    const profile = await fetchGoogleProfile(token);

    const mode =
      opts?.mode || state.cloudSync.encryptionMode || 'email';

    const payload: VaultPayload = {
      notes: state.notes,
      tabFolders: state.tabFolders,
      exportedAt: Date.now(),
    };

    const encrypted = await cryptoService.encryptVault(payload, {
      mode,
      email: profile.email,
      userId: profile.id,
      passphrase: opts?.passphrase,
    });

    const folderId = await findOrCreateDriveFolder(token);
    const existingFileId =
      state.cloudSync.driveFileId || (await findVaultFileId(token, folderId));

    const fileId = await uploadEncryptedFile(
      token,
      folderId,
      existingFileId,
      encrypted
    );

    const syncedAt = Date.now();
    await storageService.setState((prev) => ({
      ...prev,
      cloudSync: {
        ...prev.cloudSync,
        email: profile.email,
        userId: profile.id,
        driveFileId: fileId,
        lastSyncedAt: syncedAt,
        encryptionEnabled: true,
        encryptionMode: mode,
        customClientId: clientId,
      },
    }));

    return { email: profile.email, fileId, syncedAt };
  },

  async extractFromDrive(opts?: {
    passphrase?: string;
    customClientId?: string;
  }): Promise<{
    email: string;
    notesCount: number;
    foldersCount: number;
  }> {
    const state = await storageService.getState();
    const clientId = opts?.customClientId ?? state.cloudSync.customClientId;
    const token = await getAccessToken(clientId);
    const profile = await fetchGoogleProfile(token);

    const folderId = await findOrCreateDriveFolder(token);
    const fileId = await findVaultFileId(token, folderId);

    if (!fileId) {
      throw new Error(
        `No encrypted vault (${VAULT_FILE_NAME}) found in Google Drive for ${profile.email}. Push your notes first from your main workstation.`
      );
    }

    const downloadRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!downloadRes.ok) {
      throw new Error(
        `Failed to download encrypted vault (${downloadRes.status}).`
      );
    }

    const vault = (await downloadRes.json()) as EncryptedVault;
    const decrypted = await cryptoService.decryptVault(vault, {
      email: profile.email,
      userId: profile.id,
      passphrase: opts?.passphrase,
    });

    const mergedNotes = mergeByUpdatedAt<Note>(
      state.notes,
      decrypted.notes || []
    );
    const mergedFolders = mergeByUpdatedAt<TabFolder>(
      state.tabFolders,
      decrypted.tabFolders || []
    );

    await storageService.setState((prev) => ({
      ...prev,
      notes: mergedNotes,
      tabFolders: mergedFolders,
      uiState: {
        ...prev.uiState,
        activeNoteId: prev.uiState.activeNoteId || mergedNotes[0]?.id || null,
      },
      cloudSync: {
        ...prev.cloudSync,
        email: profile.email,
        userId: profile.id,
        driveFileId: fileId,
        lastSyncedAt: Date.now(),
        encryptionEnabled: true,
        encryptionMode: vault.mode,
        customClientId: clientId,
      },
    }));

    return {
      email: profile.email,
      notesCount: decrypted.notes?.length ?? 0,
      foldersCount: decrypted.tabFolders?.length ?? 0,
    };
  },
};
