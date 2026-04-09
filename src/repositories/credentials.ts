import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Credential } from '../types';

export interface CredentialsRepository {
  get(credentialId: string): Promise<Credential>;
  listIds(): Promise<string[]>;
}

// Secrets Manager: one secret holding all users as JSON
// Shape: { "tristan": { "email": "...", "password": "..." }, "paul": { ... } }
export class SecretsManagerCredentialsRepository implements CredentialsRepository {
  private client: SecretsManagerClient;
  private secretName: string;
  private cache: Record<string, Credential> | null = null;

  constructor(secretName: string, region = process.env.AWS_REGION ?? 'eu-central-1') {
    this.secretName = secretName;
    this.client = new SecretsManagerClient({ region });
  }

  private async load(): Promise<Record<string, Credential>> {
    if (this.cache) return this.cache;

    const result = await this.client.send(new GetSecretValueCommand({ SecretId: this.secretName }));
    const raw = result.SecretString;
    if (!raw) throw new Error(`Secret ${this.secretName} has no string value`);

    this.cache = JSON.parse(raw) as Record<string, Credential>;
    return this.cache;
  }

  async get(credentialId: string): Promise<Credential> {
    const all = await this.load();
    const cred = all[credentialId];
    if (!cred) throw new Error(`Credential '${credentialId}' not found in secret`);
    return cred;
  }

  async listIds(): Promise<string[]> {
    const all = await this.load();
    return Object.keys(all);
  }
}

// Local: reads from env vars CREDENTIAL_<ID>_EMAIL and CREDENTIAL_<ID>_PASSWORD
// or from a local JSON file at LOCAL_CREDENTIALS_FILE
export class LocalCredentialsRepository implements CredentialsRepository {
  private data: Record<string, Credential>;

  constructor(data?: Record<string, Credential>) {
    if (data) {
      this.data = data;
      return;
    }

    // Try loading from file
    const filePath = process.env.LOCAL_CREDENTIALS_FILE;
    if (filePath) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.data = require(filePath) as Record<string, Credential>;
      return;
    }

    // Fall back to env vars: CREDENTIAL_TRISTAN_EMAIL, CREDENTIAL_TRISTAN_PASSWORD
    this.data = {};
    for (const [key, value] of Object.entries(process.env)) {
      const match = key.match(/^CREDENTIAL_(.+)_EMAIL$/);
      if (match && value) {
        const id = match[1].toLowerCase();
        const password = process.env[`CREDENTIAL_${match[1]}_PASSWORD`] ?? '';
        this.data[id] = { email: value, password };
      }
    }
  }

  async get(credentialId: string): Promise<Credential> {
    const cred = this.data[credentialId];
    if (!cred) throw new Error(`Credential '${credentialId}' not found locally`);
    return cred;
  }

  async listIds(): Promise<string[]> {
    return Object.keys(this.data);
  }
}
