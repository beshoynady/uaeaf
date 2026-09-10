import { Logger, Module, ServiceUnavailableException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryConfig } from '../../../config/cloudinary.config.js';
import {
  CLOUDINARY_UPLOADER,
  CloudinaryStorageProvider,
  type CloudinaryUploader,
} from './cloudinary-storage.provider.js';
import { STORAGE_PROVIDER } from './storage-provider.js';

/**
 * Binds the image store.
 *
 * The credentials are optional at boot (see `validation.schema.ts`), so this
 * module always provides an uploader — a configured one where the three
 * variables are present, and otherwise one that refuses every call with a
 * message naming what is missing. The alternative, failing startup, would
 * mean no e2e spec and no credential-free checkout could run the
 * application at all, in exchange for learning at boot what is otherwise
 * learned at the first upload.
 */
@Module({
  imports: [ConfigModule.forFeature(cloudinaryConfig)],
  providers: [
    {
      provide: CLOUDINARY_UPLOADER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): CloudinaryUploader => {
        const cloudName = config.get<string>('cloudinary.cloudName');
        const apiKey = config.get<string>('cloudinary.apiKey');
        const apiSecret = config.get<string>('cloudinary.apiSecret');

        const missing = [
          !cloudName && 'CLOUDINARY_CLOUD_NAME',
          !apiKey && 'CLOUDINARY_API_KEY',
          !apiSecret && 'CLOUDINARY_API_SECRET',
        ].filter(Boolean);

        if (missing.length > 0) {
          new Logger('StorageModule').warn(
            `Image uploads are disabled: ${missing.join(', ')} not set.`,
          );
          return unconfigured(missing as string[]);
        }

        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
          secure: true,
        });
        return cloudinary.uploader as unknown as CloudinaryUploader;
      },
    },
    { provide: STORAGE_PROVIDER, useClass: CloudinaryStorageProvider },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}

/** Stands in when credentials are absent. Refusing with the variable names
 *  is the whole value: the failure an editor reports then contains its own
 *  fix, instead of arriving as an authentication error from a third party. */
function unconfigured(missing: string[]): CloudinaryUploader {
  const refuse = () => {
    throw new ServiceUnavailableException(
      `The image store is not configured (${missing.join(', ')}).`,
    );
  };
  return {
    upload: refuse,
    upload_stream: refuse,
    destroy: refuse,
  } as unknown as CloudinaryUploader;
}
