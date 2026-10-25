import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2Config = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_ACCESS_KEY_SECRET,
  accountId: process.env.R2_ACCOUNT_ID,
  bucket: process.env.R2_BUCKET,
  endpoint: process.env.R2_ENDPOINT,
  region: process.env.R2_REGION || 'auto',
};

function ensureR2Config() {
  const missing = Object.entries(r2Config)
    .filter(([key, value]) => key !== 'region' && !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing R2 env vars: ${missing.join(', ')}`);
  }
}

function getClient() {
  ensureR2Config();
  return new S3Client({
    region: r2Config.region,
    endpoint: r2Config.endpoint,
    credentials: {
      accessKeyId: r2Config.accessKeyId as string,
      secretAccessKey: r2Config.secretAccessKey as string,
    },
  });
}

export type StorageKind = 'planos' | 'comprobantes' | 'adjuntos' | 'pendientes';

export function buildObjectKey(options: {
  projectId: string;
  kind: StorageKind;
  filename: string;
}) {
  const safeName = options.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `obratracker/projects/${options.projectId}/${options.kind}/${Date.now()}-${safeName}`;
}

export async function getPresignedUploadUrl(options: {
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: r2Config.bucket,
    Key: options.key,
    ContentType: options.contentType,
  });

  return getSignedUrl(client, command, { expiresIn: options.expiresIn ?? 300 });
}

export async function getPresignedDownloadUrl(options: {
  key: string;
  expiresIn?: number;
}) {
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: r2Config.bucket,
    Key: options.key,
  });

  return getSignedUrl(client, command, { expiresIn: options.expiresIn ?? 300 });
}

export async function getObjectBytes(key: string): Promise<{ bytes: Uint8Array; contentType?: string }> {
  const client = getClient();
  const response = await client.send(new GetObjectCommand({
    Bucket: r2Config.bucket,
    Key: key,
  }));

  if (!response.Body) {
    throw new Error('Objeto vacío');
  }

  const bytes = await response.Body.transformToByteArray();
  return { bytes, contentType: response.ContentType };
}

export async function deleteObject(key: string) {
  const client = getClient();
  await client.send(new DeleteObjectCommand({
    Bucket: r2Config.bucket,
    Key: key,
  }));
}

export function isR2Key(value: string) {
  return value && !value.startsWith('http') && !value.startsWith('/uploads');
}
