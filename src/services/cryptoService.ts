import { EncryptedVault, Note, TabFolder } from '@/types';

export interface VaultPayload {
  notes: Note[];
  tabFolders: TabFolder[];
  exportedAt: number;
}

const APP_KEY_NAMESPACE = 'SideNoteBook::AES256GCM::v1';
const PBKDF2_ITERATIONS = 150000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildSecretMaterial(params: {
  mode: 'email' | 'passphrase';
  email: string;
  userId?: string;
  passphrase?: string;
}): string {
  const normalizedEmail = params.email.trim().toLowerCase();
  if (params.mode === 'passphrase') {
    if (!params.passphrase || !params.passphrase.trim()) {
      throw new Error('Master passphrase is required in passphrase mode.');
    }
    return `${APP_KEY_NAMESPACE}::${normalizedEmail}::${params.passphrase}`;
  }

  // Zero-prompt automatic unlock derived from authenticated Google account identity
  return `${APP_KEY_NAMESPACE}::${normalizedEmail}::${params.userId || normalizedEmail}`;
}

async function deriveAesKey(
  secretMaterial: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const rawKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretMaterial),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export const cryptoService = {
  async encryptVault(
    payload: VaultPayload,
    opts: {
      mode: 'email' | 'passphrase';
      email: string;
      userId?: string;
      passphrase?: string;
    }
  ): Promise<EncryptedVault> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const secret = buildSecretMaterial(opts);
    const key = await deriveAesKey(secret, salt);

    const plaintextBytes = new TextEncoder().encode(JSON.stringify(payload));
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      plaintextBytes
    );

    const emailHash = await sha256Hex(opts.email);

    return {
      version: 1,
      mode: opts.mode,
      emailHash,
      iv: bytesToBase64(iv),
      salt: bytesToBase64(salt),
      ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
      updatedAt: Date.now(),
    };
  },

  async decryptVault(
    vault: EncryptedVault,
    opts: {
      email: string;
      userId?: string;
      passphrase?: string;
    }
  ): Promise<VaultPayload> {
    const expectedHash = await sha256Hex(opts.email);
    if (vault.emailHash && vault.emailHash !== expectedHash) {
      throw new Error(
        'This encrypted vault belongs to a different Gmail address.'
      );
    }

    const salt = base64ToBytes(vault.salt);
    const iv = base64ToBytes(vault.iv);
    const ciphertext = base64ToBytes(vault.ciphertext);

    const secret = buildSecretMaterial({
      mode: vault.mode || 'email',
      email: opts.email,
      userId: opts.userId,
      passphrase: opts.passphrase,
    });
    const key = await deriveAesKey(secret, salt);

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        key,
        ciphertext.buffer as ArrayBuffer
      );
      const jsonText = new TextDecoder().decode(decryptedBuffer);
      return JSON.parse(jsonText) as VaultPayload;
    } catch {
      throw new Error(
        vault.mode === 'passphrase'
          ? 'Decryption failed — check your Master Passphrase.'
          : 'Decryption failed — account identity mismatch or corrupted vault.'
      );
    }
  },
};
