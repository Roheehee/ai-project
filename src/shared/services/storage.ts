import { R2Provider, S3Provider, StorageManager } from '@/extensions/storage';
import { Configs, getAllConfigs } from '@/shared/models/config';

/**
 * get storage service with configs
 */
export function getStorageServiceWithConfigs(configs: Configs) {
  const storageManager = new StorageManager();
  const r2AccessKey = configs.r2_access_key || process.env.STORAGE_ACCESS_KEY_ID;
  const r2SecretKey =
    configs.r2_secret_key || process.env.STORAGE_SECRET_ACCESS_KEY;
  const r2BucketName =
    configs.r2_bucket_name || process.env.STORAGE_BUCKET_NAME;
  const r2Endpoint = configs.r2_endpoint || process.env.STORAGE_ENDPOINT;
  const r2Domain = configs.r2_domain || process.env.STORAGE_PUBLIC_URL;
  const r2AccountId =
    configs.r2_account_id ||
    process.env.R2_ACCOUNT_ID ||
    (r2Endpoint
      ? r2Endpoint
          .replace(/^https?:\/\//, '')
          .split('.r2.cloudflarestorage.com')[0]
      : '');
  const normalizedR2Endpoint = (() => {
    if (!r2Endpoint) return '';
    const endpoint = r2Endpoint.replace(/\/+$/, '');
    const bucketSuffix = r2BucketName ? `/${r2BucketName}` : '';
    return bucketSuffix && endpoint.endsWith(bucketSuffix)
      ? endpoint.slice(0, -bucketSuffix.length)
      : endpoint;
  })();
  const normalizedR2Domain = r2Domain
    ? r2Domain.startsWith('http://') || r2Domain.startsWith('https://')
      ? r2Domain.replace(/\/+$/, '')
      : `https://${r2Domain.replace(/\/+$/, '')}`
    : '';

  // Add R2 provider if configured
  if (r2AccessKey && r2SecretKey && r2BucketName) {
    // r2_region in settings stores the Cloudflare Account ID
    // For R2, region is typically "auto" but can be customized
    const accountId = r2AccountId || '';

    storageManager.addProvider(
      new R2Provider({
        accountId: accountId,
        accessKeyId: r2AccessKey,
        secretAccessKey: r2SecretKey,
        bucket: r2BucketName,
        uploadPath: configs.r2_upload_path,
        region: 'auto', // R2 uses "auto" as region
        endpoint: normalizedR2Endpoint, // Optional custom endpoint
        publicDomain: normalizedR2Domain,
      }),
      true // Set R2 as default
    );
  }

  // Add S3 provider if configured (future support)
  if (configs.s3_access_key && configs.s3_secret_key && configs.s3_bucket) {
    storageManager.addProvider(
      new S3Provider({
        endpoint: configs.s3_endpoint,
        region: configs.s3_region,
        accessKeyId: configs.s3_access_key,
        secretAccessKey: configs.s3_secret_key,
        bucket: configs.s3_bucket,
        publicDomain: configs.s3_domain,
      })
    );
  }

  return storageManager;
}

/**
 * global storage service
 */
let storageService: StorageManager | null = null;

/**
 * get storage service instance
 */
export async function getStorageService(
  configs?: Configs
): Promise<StorageManager> {
  if (!configs) {
    configs = await getAllConfigs();
  }
  storageService = getStorageServiceWithConfigs(configs);

  return storageService;
}
