'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Download,
  ImageIcon,
  Loader2,
  Package2,
  PenLine,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { AITaskStatus, AIMediaType } from '@/extensions/ai/types';
import {
  ImageUploader,
  ImageUploaderValue,
} from '@/shared/blocks/common';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Progress } from '@/shared/components/ui/progress';
import { Textarea } from '@/shared/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';

interface ProductImageGeneratorProps {
  className?: string;
  srOnlyTitle?: string;
}

interface GeneratedImage {
  id: string;
  url: string;
}

interface BackendTask {
  id: string;
  status: string;
  taskInfo: string | null;
  taskResult: string | null;
}

type GenerationMode = 'text-to-image' | 'image-to-image';

type PresetOption = {
  id: string;
  titleKey: string;
  prompt: string;
};

const STYLE_OPTIONS: PresetOption[] = [
  {
    id: 'clean',
    titleKey: 'clean',
    prompt:
      'minimal commercial packshot, polished ecommerce hero image, premium catalog finish, clean styling',
  },
  {
    id: 'luxury',
    titleKey: 'luxury',
    prompt:
      'luxury advertising photography, refined materials, upscale brand presentation, elegant premium atmosphere',
  },
  {
    id: 'organic',
    titleKey: 'organic',
    prompt:
      'natural lifestyle product photography, fresh organic mood, soft tactile textures, believable wellness brand aesthetic',
  },
  {
    id: 'tech',
    titleKey: 'tech',
    prompt:
      'modern tech launch visual, sleek industrial styling, crisp highlights, contemporary premium device photography',
  },
  {
    id: 'beauty',
    titleKey: 'beauty',
    prompt:
      'beauty campaign visual, glossy editorial product shot, refined reflections, cosmetics advertising quality',
  },
  {
    id: 'food',
    titleKey: 'food',
    prompt:
      'appetizing commercial food product photography, vibrant but realistic, inviting styling, retail-ready packaging shot',
  },
];

const BACKGROUND_OPTIONS: PresetOption[] = [
  {
    id: 'white',
    titleKey: 'white',
    prompt:
      'pure white seamless background, marketplace-ready, clean surface, subtle grounding shadow',
  },
  {
    id: 'gradient',
    titleKey: 'gradient',
    prompt:
      'soft premium gradient backdrop with gentle falloff, modern studio background, tasteful brand color atmosphere',
  },
  {
    id: 'marble',
    titleKey: 'marble',
    prompt:
      'luxury marble or stone surface, tasteful high-end commercial styling, clean premium set design',
  },
  {
    id: 'concrete',
    titleKey: 'concrete',
    prompt:
      'concrete studio plinth and textured backdrop, modern editorial still life styling, realistic shadows',
  },
  {
    id: 'botanical',
    titleKey: 'botanical',
    prompt:
      'botanical lifestyle set, soft greenery, natural props kept subtle, premium commercial composition',
  },
  {
    id: 'kitchen',
    titleKey: 'kitchen',
    prompt:
      'clean kitchen counter lifestyle scene, bright natural environment, realistic commercial context',
  },
  {
    id: 'vanity',
    titleKey: 'vanity',
    prompt:
      'beauty vanity scene with tasteful reflective surfaces, soft premium bathroom styling, elegant commercial set',
  },
  {
    id: 'acrylic',
    titleKey: 'acrylic',
    prompt:
      'reflective acrylic stage, glossy premium reflections, futuristic ecommerce campaign background',
  },
];

const SHOT_OPTIONS: PresetOption[] = [
  {
    id: 'front',
    titleKey: 'front',
    prompt: 'straight-on hero packshot, centered composition, product as the only main subject',
  },
  {
    id: 'angle',
    titleKey: 'angle',
    prompt:
      'three-quarter angle product hero shot, premium commercial composition, dynamic but realistic perspective',
  },
  {
    id: 'flatlay',
    titleKey: 'flatlay',
    prompt:
      'top-down flat lay product composition, neat spacing, catalog quality arrangement, clean visual hierarchy',
  },
  {
    id: 'floating',
    titleKey: 'floating',
    prompt:
      'floating product hero shot with realistic contact shadow and believable depth, premium ecommerce look',
  },
  {
    id: 'macro',
    titleKey: 'macro',
    prompt:
      'close-up macro product detail shot, rich material texture, premium retouching, crisp commercial sharpness',
  },
];

const LIGHT_OPTIONS: PresetOption[] = [
  {
    id: 'softbox',
    titleKey: 'softbox',
    prompt: 'diffused softbox lighting, smooth gradients, realistic commercial highlights',
  },
  {
    id: 'daylight',
    titleKey: 'daylight',
    prompt: 'bright natural daylight, soft directional shadow, authentic airy realism',
  },
  {
    id: 'dramatic',
    titleKey: 'dramatic',
    prompt: 'dramatic spotlight lighting, high contrast, premium ad campaign mood',
  },
  {
    id: 'glow',
    titleKey: 'glow',
    prompt: 'soft luminous glow, refined bloom, polished beauty-ad look',
  },
  {
    id: 'catalog',
    titleKey: 'catalog',
    prompt: 'balanced catalog lighting, neutral color rendering, consistent ecommerce presentation',
  },
];

const QUALITY_OPTIONS = ['0.5K', '1K', '2K', '4K'] as const;
const RATIO_OPTIONS = ['1:1', '4:5', '3:4', '16:9'] as const;
const THINKING_OPTIONS = ['auto', 'min', 'high'] as const;

const PROVIDER = 'evolink';
const MODEL = 'gemini-3.1-flash-image-preview';
const POLL_INTERVAL = 5000;
const GENERATION_TIMEOUT = 180000;

function parseTaskInfo(taskInfo: string | null) {
  if (!taskInfo) {
    return null;
  }

  try {
    return JSON.parse(taskInfo);
  } catch {
    return null;
  }
}

function extractImageUrls(result: any): string[] {
  if (!result) {
    return [];
  }

  if (Array.isArray(result?.images)) {
    return result.images
      .map((item: any) => item?.imageUrl || item?.url)
      .filter(Boolean);
  }

  if (Array.isArray(result?.output)) {
    return result.output
      .map((item: any) => item?.url || item?.imageUrl || item)
      .filter(Boolean);
  }

  if (Array.isArray(result?.result_data)) {
    return result.result_data
      .map((item: any) => item?.url || item?.imageUrl || item)
      .filter(Boolean);
  }

  if (Array.isArray(result?.results)) {
    return result.results
      .map((item: any) => item?.url || item?.imageUrl || item)
      .filter(Boolean);
  }

  return [];
}

function buildPrompt({
  product,
  details,
  brandColor,
  stylePrompt,
  backgroundPrompt,
  shotPrompt,
  lightPrompt,
}: {
  product: string;
  details: string;
  brandColor: string;
  stylePrompt: string;
  backgroundPrompt: string;
  shotPrompt: string;
  lightPrompt: string;
}) {
  const segments = [
    product
      ? `Create a professional ecommerce product image for ${product}.`
      : 'Create a professional ecommerce product image for the uploaded reference product.',
    'The image should look like a premium commercial product photography shoot for a high-converting online store.',
    stylePrompt,
    backgroundPrompt,
    shotPrompt,
    lightPrompt,
    brandColor
      ? `Use ${brandColor} as a tasteful accent color in the set design without overwhelming the product.`
      : '',
    details ? `Important product details: ${details}.` : '',
    'Keep the product anatomically and structurally accurate, with realistic materials, believable reflections, precise edges, and a grounded natural shadow.',
    'One main hero product only, uncluttered composition, no extra unrelated objects, no watermark, no collage, no hands, no people unless explicitly implied by the scene, no distorted packaging, no gibberish text.',
    'Commercial retouching, photorealistic, polished, studio-grade quality.',
  ];

  return segments.filter(Boolean).join(' ');
}

function resolveGeneratorErrorMessage(
  message: string | undefined,
  t: ReturnType<typeof useTranslations>
) {
  if (!message) {
    return t('errors.failed');
  }

  if (
    message.startsWith('errors.') ||
    message === 'provider_quota_exceeded' ||
    message === 'provider_timeout' ||
    message === 'reference_storage_required' ||
    message === 'storage_not_configured'
  ) {
    const key = message.startsWith('errors.') ? message.slice(7) : message;
    return t(`errors.${key}`);
  }

  return message;
}

export function ProductImageGenerator({
  className,
  srOnlyTitle,
}: ProductImageGeneratorProps) {
  const t = useTranslations('ai.product_image.generator');
  const searchParams = useSearchParams();
  const [product, setProduct] = useState('');
  const [details, setDetails] = useState('');
  const [brandColor, setBrandColor] = useState('');
  const [style, setStyle] = useState(STYLE_OPTIONS[0].id);
  const [background, setBackground] = useState(BACKGROUND_OPTIONS[0].id);
  const [shot, setShot] = useState(SHOT_OPTIONS[0].id);
  const [lighting, setLighting] = useState(LIGHT_OPTIONS[0].id);
  const [generationMode, setGenerationMode] =
    useState<GenerationMode>('text-to-image');
  const [ratio, setRatio] = useState<(typeof RATIO_OPTIONS)[number]>('1:1');
  const [quality, setQuality] = useState<(typeof QUALITY_OPTIONS)[number]>('0.5K');
  const [thinkingLevel, setThinkingLevel] =
    useState<(typeof THINKING_OPTIONS)[number]>('min');
  const [referenceImageItems, setReferenceImageItems] = useState<
    ImageUploaderValue[]
  >([]);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(
    null
  );
  const [taskStatus, setTaskStatus] = useState<AITaskStatus | null>(null);
  const [downloadingImageId, setDownloadingImageId] = useState<string | null>(
    null
  );

  const [guestCredits, setGuestCredits] = useState(0);

  const { user, fetchUserCredits } = useAppContext();
  const remainingCredits = user?.credits?.remainingCredits ?? guestCredits;
  const isReferenceMode = generationMode === 'image-to-image';
  const costCredits = isReferenceMode ? 4 : 2;

  const selectedStyle =
    STYLE_OPTIONS.find((item) => item.id === style) || STYLE_OPTIONS[0];
  const selectedBackground =
    BACKGROUND_OPTIONS.find((item) => item.id === background) ||
    BACKGROUND_OPTIONS[0];
  const selectedShot =
    SHOT_OPTIONS.find((item) => item.id === shot) || SHOT_OPTIONS[0];
  const selectedLighting =
    LIGHT_OPTIONS.find((item) => item.id === lighting) || LIGHT_OPTIONS[0];

  const handleReferenceImagesChange = useCallback(
    (items: ImageUploaderValue[]) => {
      setReferenceImageItems(items);

      const uploadedUrls = items
        .filter((item) => item.status === 'uploaded' && item.url)
        .map((item) => item.url as string);

      setReferenceImageUrls(uploadedUrls);
    },
    []
  );

  const isReferenceUploading = referenceImageItems.some(
    (item) => item.status === 'uploading'
  );
  const hasReferenceUploadError = referenceImageItems.some(
    (item) => item.status === 'error'
  );
  const isLocalFallbackReference = referenceImageUrls.some((url) =>
    url.startsWith('/uploads/local/')
  );

  const refreshCredits = useCallback(async () => {
    if (user) {
      await fetchUserCredits();
      return;
    }

    try {
      const resp = await fetch('/api/user/get-user-credits', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }

      const result = await resp.json();
      if (result.code !== 0) {
        throw new Error(result.message || t('errors.failed'));
      }

      setGuestCredits(result.data?.remainingCredits || 0);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch guest credits failed:', error);
      }
      setGuestCredits(0);
    }
  }, [fetchUserCredits, t, user]);

  useEffect(() => {
    const initialProduct = searchParams.get('product');
    const initialDetails = searchParams.get('details');
    const initialBrandColor = searchParams.get('brandColor');
    const initialStyle = searchParams.get('style');
    const initialBackground = searchParams.get('background');
    const initialShot = searchParams.get('shot');
    const initialLighting = searchParams.get('lighting');
    const initialMode = searchParams.get('mode');
    const initialRatio = searchParams.get('ratio');
    const initialQuality = searchParams.get('quality');
    const initialThinking = searchParams.get('thinking');

    if (initialProduct) setProduct(initialProduct);
    if (initialDetails) setDetails(initialDetails);
    if (initialBrandColor) setBrandColor(initialBrandColor);
    if (initialStyle && STYLE_OPTIONS.some((item) => item.id === initialStyle)) {
      setStyle(initialStyle);
    }
    if (
      initialBackground &&
      BACKGROUND_OPTIONS.some((item) => item.id === initialBackground)
    ) {
      setBackground(initialBackground);
    }
    if (initialShot && SHOT_OPTIONS.some((item) => item.id === initialShot)) {
      setShot(initialShot);
    }
    if (
      initialLighting &&
      LIGHT_OPTIONS.some((item) => item.id === initialLighting)
    ) {
      setLighting(initialLighting);
    }
    if (
      initialMode &&
      ['text-to-image', 'image-to-image'].includes(initialMode)
    ) {
      setGenerationMode(initialMode as GenerationMode);
    }
    if (
      initialRatio &&
      RATIO_OPTIONS.includes(initialRatio as (typeof RATIO_OPTIONS)[number])
    ) {
      setRatio(initialRatio as (typeof RATIO_OPTIONS)[number]);
    }
    if (
      initialQuality &&
      QUALITY_OPTIONS.includes(
        initialQuality as (typeof QUALITY_OPTIONS)[number]
      )
    ) {
      setQuality(initialQuality as (typeof QUALITY_OPTIONS)[number]);
    }
    if (
      initialThinking &&
      THINKING_OPTIONS.includes(
        initialThinking as (typeof THINKING_OPTIONS)[number]
      )
    ) {
      setThinkingLevel(initialThinking as (typeof THINKING_OPTIONS)[number]);
    }
  }, [searchParams]);

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  const composedPrompt = buildPrompt({
    product: product.trim(),
    details: details.trim(),
    brandColor: brandColor.trim(),
    stylePrompt: selectedStyle.prompt,
    backgroundPrompt: selectedBackground.prompt,
    shotPrompt: selectedShot.prompt,
    lightPrompt: selectedLighting.prompt,
  });

  useEffect(() => {
    if (!taskId || !isGenerating) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        if (
          generationStartTime &&
          Date.now() - generationStartTime > GENERATION_TIMEOUT
        ) {
          setIsGenerating(false);
          setTaskId(null);
          setProgress(0);
          setTaskStatus(null);
          toast.error(t('errors.timeout'));
          return;
        }

        const resp = await fetch('/api/ai/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId }),
        });

        const result = await resp.json();
        if (!resp.ok || result.code !== 0) {
          throw new Error(result.message || 'query failed');
        }

        const task = result.data as BackendTask;
        const status = task.status as AITaskStatus;
        const taskInfo = parseTaskInfo(task.taskInfo);
        const taskResult = parseTaskInfo(task.taskResult);
        const imageUrls = [
          ...extractImageUrls(taskInfo),
          ...extractImageUrls(taskResult),
        ].filter((url, index, urls) => urls.indexOf(url) === index);

        setTaskStatus(status);

        if (status === AITaskStatus.PENDING) {
          setProgress((prev) => Math.max(prev, 25));
          return;
        }

        if (status === AITaskStatus.PROCESSING) {
          setProgress((prev) => Math.min(prev + 10, 85));
          return;
        }

        if (status === AITaskStatus.SUCCESS) {
          setGeneratedImages(
            imageUrls.map((url, index) => ({
              id: `${task.id}-${index}`,
              url,
            }))
          );
          setProgress(100);
          setIsGenerating(false);
          setTaskId(null);
          setTaskStatus(null);
          toast.success(t('success.generated'));
          void refreshCredits();
          return;
        }

        if (status === AITaskStatus.FAILED) {
          setIsGenerating(false);
          setTaskId(null);
          setProgress(0);
          setTaskStatus(null);
          toast.error(
            resolveGeneratorErrorMessage(taskInfo?.errorMessage, t)
          );
          void refreshCredits();
        }
      } catch (error: any) {
        setIsGenerating(false);
        setTaskId(null);
        setProgress(0);
        setTaskStatus(null);
        toast.error(resolveGeneratorErrorMessage(error.message, t));
      }
    };

    poll();

    const interval = setInterval(() => {
      if (!cancelled) {
        poll();
      }
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [taskId, isGenerating, generationStartTime, refreshCredits, t]);

  async function handleGenerate() {
    if (!isReferenceMode && !product.trim()) {
      toast.error(t('errors.product_required'));
      return;
    }

    if (isReferenceMode && referenceImageUrls.length === 0) {
      toast.error(t('errors.reference_image_required'));
      return;
    }

    if (isReferenceMode && isLocalFallbackReference) {
      toast.error(t('errors.reference_storage_required'));
      return;
    }

    if (isReferenceUploading) {
      toast.error(t('errors.reference_uploading'));
      return;
    }

    if (hasReferenceUploadError) {
      toast.error(t('errors.reference_upload_failed'));
      return;
    }

    if (remainingCredits < costCredits) {
      toast.error(t('errors.insufficient_credits'));
      return;
    }

    setIsGenerating(true);
    setProgress(15);
    setTaskStatus(AITaskStatus.PENDING);
    setGeneratedImages([]);
    setGenerationStartTime(Date.now());

    try {
      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaType: AIMediaType.IMAGE,
          scene: isReferenceMode ? 'image-to-image' : 'text-to-image',
          provider: PROVIDER,
          model: MODEL,
          prompt: composedPrompt,
          options: {
            ...(isReferenceMode
              ? {
                  image_input: referenceImageUrls,
                }
              : {}),
            size: ratio,
            quality,
            model_params: {
              thinking_level: thinkingLevel,
            },
          },
        }),
      });

      const result = await resp.json();
      if (!resp.ok || result.code !== 0) {
        throw new Error(
          resolveGeneratorErrorMessage(result.message, t)
        );
      }

      if (!result.data?.id) {
        throw new Error(t('errors.failed'));
      }

      setTaskId(result.data.id);
      setProgress(25);
      void refreshCredits();
    } catch (error: any) {
      setIsGenerating(false);
      setProgress(0);
      setTaskStatus(null);
      toast.error(resolveGeneratorErrorMessage(error.message, t));
    }
  }

  async function handleDownload(url: string, id: string) {
    try {
      setDownloadingImageId(id);
      const resp = await fetch(
        `/api/proxy/file?url=${encodeURIComponent(url)}`
      );
      if (!resp.ok) {
        throw new Error('download failed');
      }

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success(t('success.downloaded'));
    } catch {
      toast.error(t('errors.download_failed'));
    } finally {
      setDownloadingImageId(null);
    }
  }

  return (
    <section className={cn('py-16 md:py-24', className)}>
      <div className="container">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <Card className="border-border/60 bg-background/95 shadow-sm">
              <CardHeader>
                {srOnlyTitle ? <h2 className="sr-only">{srOnlyTitle}</h2> : null}
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="size-3.5" />
                    {t('badge')}
                  </Badge>
                </div>
                <CardTitle className="mt-3 flex items-center gap-2 text-2xl">
                  <Package2 className="size-5" />
                  {t('title')}
                </CardTitle>
                <CardDescription>{t('description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    {t('fields.mode')}
                  </Label>
                  <ToggleGroup
                    type="single"
                    value={generationMode}
                    onValueChange={(value) => {
                      if (value) {
                        setGenerationMode(value as GenerationMode);
                      }
                    }}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                  >
                    <ToggleGroupItem
                      value="text-to-image"
                      aria-label={t('modes.text_to_image')}
                      className="group h-auto justify-start rounded-lg border border-border/70 bg-background px-4 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:shadow-md data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:shadow-[0_10px_24px_rgba(249,115,22,0.16)]"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-data-[state=on]:bg-primary group-data-[state=on]:text-primary-foreground">
                          <PenLine className="size-4" />
                        </span>
                        <span className="min-w-0 space-y-1">
                          <span className="block text-base font-semibold leading-none">
                            {t('modes.text_to_image')}
                          </span>
                          <span className="block whitespace-normal text-sm leading-5 text-muted-foreground">
                            {t('modes.text_to_image_description')}
                          </span>
                        </span>
                      </div>
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="image-to-image"
                      aria-label={t('modes.image_to_image')}
                      className="group h-auto justify-start rounded-lg border border-border/70 bg-background px-4 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:shadow-md data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:shadow-[0_10px_24px_rgba(249,115,22,0.16)]"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-data-[state=on]:bg-primary group-data-[state=on]:text-primary-foreground">
                          <UploadCloud className="size-4" />
                        </span>
                        <span className="min-w-0 space-y-1">
                          <span className="block text-base font-semibold leading-none">
                            {t('modes.image_to_image')}
                          </span>
                          <span className="block whitespace-normal text-sm leading-5 text-muted-foreground">
                            {t('modes.image_to_image_description')}
                          </span>
                        </span>
                      </div>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {!isReferenceMode ? (
                  <div className="space-y-3">
                    <Label htmlFor="product-name">{t('fields.product')}</Label>
                    <Input
                      id="product-name"
                      value={product}
                      onChange={(event) => setProduct(event.target.value)}
                      placeholder={t('fields.product_placeholder')}
                    />
                  </div>
                ) : null}

                {isReferenceMode ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="text-primary size-4" />
                      <Label>{t('fields.reference_image')}</Label>
                    </div>
                    <ImageUploader
                      title={t('fields.reference_image')}
                      showTitle={false}
                      allowMultiple={false}
                      maxImages={1}
                      maxSizeMB={10}
                      onChange={handleReferenceImagesChange}
                      emptyHint={t('fields.reference_image_placeholder')}
                    />
                    {hasReferenceUploadError ? (
                      <p className="text-destructive text-xs">
                        {t('errors.reference_upload_failed')}
                      </p>
                    ) : null}
                    {!hasReferenceUploadError && isLocalFallbackReference ? (
                      <p className="text-muted-foreground text-xs">
                        {t('errors.reference_storage_required')}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {!isReferenceMode ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label htmlFor="product-details">
                        {t('fields.details')}
                      </Label>
                      <Textarea
                        id="product-details"
                        value={details}
                        onChange={(event) => setDetails(event.target.value)}
                        placeholder={t('fields.details_placeholder')}
                        rows={5}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="brand-color">
                        {t('fields.brand_color')}
                      </Label>
                      <Input
                        id="brand-color"
                        value={brandColor}
                        onChange={(event) => setBrandColor(event.target.value)}
                        placeholder={t('fields.brand_color_placeholder')}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="space-y-6">
                  <PresetGroup
                    label={t('fields.style')}
                    value={style}
                    onValueChange={(value) => value && setStyle(value)}
                    options={STYLE_OPTIONS}
                    translator={t}
                  />
                  <PresetGroup
                    label={t('fields.background')}
                    value={background}
                    onValueChange={(value) => value && setBackground(value)}
                    options={BACKGROUND_OPTIONS}
                    translator={t}
                  />
                  <PresetGroup
                    label={t('fields.shot')}
                    value={shot}
                    onValueChange={(value) => value && setShot(value)}
                    options={SHOT_OPTIONS}
                    translator={t}
                  />
                  <PresetGroup
                    label={t('fields.lighting')}
                    value={lighting}
                    onValueChange={(value) => value && setLighting(value)}
                    options={LIGHT_OPTIONS}
                    translator={t}
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div className="space-y-3">
                    <Label>{t('fields.ratio')}</Label>
                    <ToggleGroup
                      type="single"
                      value={ratio}
                      onValueChange={(value) =>
                        value && setRatio(value as (typeof RATIO_OPTIONS)[number])
                      }
                      variant="outline"
                      className="grid w-full grid-cols-2 gap-2"
                    >
                      {RATIO_OPTIONS.map((item) => (
                        <ToggleGroupItem
                          key={item}
                          value={item}
                          className="rounded-md border"
                        >
                          {item}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>{t('fields.quality')}</Label>
                    <ToggleGroup
                      type="single"
                      value={quality}
                      onValueChange={(value) =>
                        value &&
                        setQuality(value as (typeof QUALITY_OPTIONS)[number])
                      }
                      variant="outline"
                      className="grid w-full grid-cols-2 gap-2"
                    >
                      {QUALITY_OPTIONS.map((item) => (
                        <ToggleGroupItem
                          key={item}
                          value={item}
                          className="rounded-md border"
                        >
                          {item}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>{t('fields.thinking')}</Label>
                    <ToggleGroup
                      type="single"
                      value={thinkingLevel}
                      onValueChange={(value) =>
                        value &&
                        setThinkingLevel(
                          value as (typeof THINKING_OPTIONS)[number]
                        )
                      }
                      variant="outline"
                      className="grid w-full grid-cols-3 gap-2"
                    >
                      {THINKING_OPTIONS.map((item) => (
                        <ToggleGroupItem
                          key={item}
                          value={item}
                          className="rounded-md border px-2"
                        >
                          {t(`thinking.${item}`)}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                </div>

                <div className="flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {t('credits_cost', { credits: costCredits })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t('credits_remaining', { credits: remainingCredits })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild variant="outline">
                      <Link href="/pricing">{t('buy_credits')}</Link>
                    </Button>
                    <Button onClick={handleGenerate} disabled={isGenerating}>
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          {t('generating')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 size-4" />
                          {t('generate')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {isGenerating ? (
                  <div className="space-y-3 rounded-xl border bg-background p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('progress')}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                    <p className="text-sm text-muted-foreground">
                      {taskStatus
                        ? t(`status.${taskStatus}`)
                        : t('status.pending')}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-background/95 shadow-sm">
              <CardHeader>
                <CardTitle>{t('preview_title')}</CardTitle>
                <CardDescription>{t('preview_description')}</CardDescription>
              </CardHeader>
              <CardContent>
                {generatedImages.length ? (
                  <div className="grid gap-4">
                    {generatedImages.map((image) => (
                      <div
                        key={image.id}
                        className="overflow-hidden rounded-xl border bg-muted/20"
                      >
                        <img
                          src={image.url}
                          alt={product || 'Generated product image'}
                          className="aspect-square w-full object-cover"
                        />
                        <div className="flex items-center justify-between p-3">
                          <span className="text-sm text-muted-foreground">
                            {ratio} · {quality}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(image.url, image.id)}
                            disabled={downloadingImageId === image.id}
                          >
                            {downloadingImageId === image.id ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                              <Download className="mr-2 size-4" />
                            )}
                            {t('download')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center">
                    <Package2 className="mb-4 size-10 text-muted-foreground" />
                    <p className="font-medium">{t('empty_title')}</p>
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                      {t('empty_description')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function PresetGroup({
  label,
  value,
  onValueChange,
  options,
  translator,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: PresetOption[];
  translator: (key: string) => string;
}) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={onValueChange}
        variant="outline"
        className="grid w-full grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.id}
            value={option.id}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {translator(`presets.${option.titleKey}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
