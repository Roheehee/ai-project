import { getUuid } from '@/shared/lib/hash';

import { saveFiles } from '.';
import {
  AIConfigs,
  AIFile,
  AIGenerateParams,
  AIImage,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
} from './types';

export interface EvolinkConfigs extends AIConfigs {
  apiKey: string;
  customStorage?: boolean;
}

type EvolinkTaskResponse = {
  id?: string;
  task_id?: string;
  status?: string;
  progress?: number;
  task_info?: Record<string, any>;
  output?: any;
  data?: any;
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
};

export class EvolinkProvider implements AIProvider {
  readonly name = 'evolink';
  configs: EvolinkConfigs;
  private baseUrl = 'https://api.evolink.ai';

  constructor(configs: EvolinkConfigs) {
    this.configs = configs;
  }

  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const { mediaType, model, prompt, options, callbackUrl } = params;

    if (mediaType !== AIMediaType.IMAGE) {
      throw new Error(`mediaType not supported: ${mediaType}`);
    }

    if (!model) {
      throw new Error('model is required');
    }

    if (!prompt) {
      throw new Error('prompt is required');
    }

    const payload: Record<string, any> = {
      model,
      prompt,
    };

    if (options?.size) {
      payload.size = options.size;
    }

    if (options?.quality) {
      payload.quality = options.quality;
    }

    if (options?.image_input && Array.isArray(options.image_input)) {
      payload.image_urls = options.image_input;
    }

    if (options?.model_params) {
      payload.model_params = options.model_params;
    }

    const isValidCallbackUrl =
      callbackUrl &&
      callbackUrl.startsWith('https://') &&
      !callbackUrl.includes('localhost') &&
      !callbackUrl.includes('127.0.0.1');

    if (isValidCallbackUrl) {
      payload.callback_url = callbackUrl;
    }

    const resp = await fetch(`${this.baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.configs.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await this.parseJson(resp);
    if (!resp.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        `request failed with status: ${resp.status}`;
      throw new Error(message);
    }

    const taskId = data?.id || data?.task_id;
    if (!taskId) {
      throw new Error('generate image failed: no task id');
    }

    return {
      taskId,
      taskStatus: this.mapStatus(data?.status),
      taskInfo: data?.task_info || {},
      taskResult: data,
    };
  }

  async query({
    taskId,
  }: {
    taskId: string;
  }): Promise<AITaskResult> {
    const resp = await fetch(`${this.baseUrl}/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.configs.apiKey}`,
      },
    });

    const data = (await this.parseJson(resp)) as EvolinkTaskResponse;
    if (!resp.ok) {
      const message =
        data?.error?.message ||
        data?.error?.code ||
        `request failed with status: ${resp.status}`;
      throw new Error(message);
    }

    const taskStatus = this.mapStatus(data?.status);
    let images = this.extractImages(data);

    if (taskStatus === AITaskStatus.SUCCESS && this.configs.customStorage) {
      images = await this.saveImages(images);
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        images,
        status: data?.status,
        errorCode: data?.error?.code || '',
        errorMessage: data?.error?.message || '',
        createTime: new Date(),
      },
      taskResult: data,
    };
  }

  private async parseJson(resp: Response) {
    const text = await resp.text();
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }

  private mapStatus(status?: string): AITaskStatus {
    switch (status) {
      case 'pending':
        return AITaskStatus.PENDING;
      case 'processing':
        return AITaskStatus.PROCESSING;
      case 'completed':
      case 'success':
        return AITaskStatus.SUCCESS;
      case 'failed':
        return AITaskStatus.FAILED;
      case 'cancelled':
      case 'canceled':
        return AITaskStatus.CANCELED;
      default:
        return AITaskStatus.PENDING;
    }
  }

  private extractImages(data: EvolinkTaskResponse): AIImage[] {
    const output =
      data?.output ||
      data?.data?.output ||
      data?.data?.images ||
      data?.data?.result ||
      data?.data;

    const imageUrls = this.extractUrls(output);

    return imageUrls.map((url) => ({
      id: getUuid(),
      createTime: new Date(),
      imageUrl: url,
    }));
  }

  private extractUrls(value: any): string[] {
    if (!value) {
      return [];
    }

    if (typeof value === 'string') {
      return [value];
    }

    if (Array.isArray(value)) {
      return value
        .flatMap((item) => this.extractUrls(item))
        .filter((item): item is string => Boolean(item));
    }

    if (typeof value === 'object') {
      const directCandidate =
        value.url ||
        value.uri ||
        value.image_url ||
        value.imageUrl ||
        value.src;
      if (typeof directCandidate === 'string') {
        return [directCandidate];
      }

      if (value.images) {
        return this.extractUrls(value.images);
      }

      if (value.output) {
        return this.extractUrls(value.output);
      }

      if (value.data) {
        return this.extractUrls(value.data);
      }
    }

    return [];
  }

  private async saveImages(images: AIImage[]) {
    if (!images.length) {
      return images;
    }

    const filesToSave: AIFile[] = [];

    images.forEach((image, index) => {
      if (!image.imageUrl) {
        return;
      }

      filesToSave.push({
        url: image.imageUrl,
        contentType: 'image/png',
        key: `evolink/image/${getUuid()}.png`,
        index,
        type: 'image',
      });
    });

    if (!filesToSave.length) {
      return images;
    }

    const uploadedFiles = await saveFiles(filesToSave);
    if (!uploadedFiles) {
      return images;
    }

    uploadedFiles.forEach((file) => {
      if (file.url && file.index !== undefined && images[file.index]) {
        images[file.index].imageUrl = file.url;
      }
    });

    return images;
  }
}
