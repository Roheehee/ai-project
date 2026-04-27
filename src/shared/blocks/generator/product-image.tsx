'use client';

import { useEffect, useState } from 'react';
import {
  Download,
  Loader2,
  Package2,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { AITaskStatus, AIMediaType } from '@/extensions/ai/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
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
}

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

const QUALITY_OPTIONS = ['1K', '2K', '4K'] as const;
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
    `Create a professional ecommerce product image for ${product}.`,
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

export function ProductImageGenerator({
  className,
  srOnlyTitle,
}: ProductImageGeneratorProps) {
  const t = useTranslations('ai.product_image.generator');
  const [product, setProduct] = useState('');
  const [details, setDetails] = useState('');
  const [brandColor, setBrandColor] = useState('');
  const [style, setStyle] = useState(STYLE_OPTIONS[0].id);
  const [background, setBackground] = useState(BACKGROUND_OPTIONS[0].id);
  const [shot, setShot] = useState(SHOT_OPTIONS[0].id);
  const [lighting, setLighting] = useState(LIGHT_OPTIONS[0].id);
  const [ratio, setRatio] = useState<(typeof RATIO_OPTIONS)[number]>('1:1');
  const [quality, setQuality] = useState<(typeof QUALITY_OPTIONS)[number]>('2K');
  const [thinkingLevel, setThinkingLevel] =
    useState<(typeof THINKING_OPTIONS)[number]>('auto');
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

  const { user, setIsShowSignModal, fetchUserCredits } = useAppContext();
  const remainingCredits = user?.credits?.remainingCredits ?? 0;
  const costCredits = 2;

  const selectedStyle =
    STYLE_OPTIONS.find((item) => item.id === style) || STYLE_OPTIONS[0];
  const selectedBackground =
    BACKGROUND_OPTIONS.find((item) => item.id === background) ||
    BACKGROUND_OPTIONS[0];
  const selectedShot =
    SHOT_OPTIONS.find((item) => item.id === shot) || SHOT_OPTIONS[0];
  const selectedLighting =
    LIGHT_OPTIONS.find((item) => item.id === lighting) || LIGHT_OPTIONS[0];

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
        const imageUrls = extractImageUrls(taskInfo);

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
          fetchUserCredits();
          return;
        }

        if (status === AITaskStatus.FAILED) {
          setIsGenerating(false);
          setTaskId(null);
          setProgress(0);
          setTaskStatus(null);
          toast.error(taskInfo?.errorMessage || t('errors.failed'));
          fetchUserCredits();
        }
      } catch (error: any) {
        setIsGenerating(false);
        setTaskId(null);
        setProgress(0);
        setTaskStatus(null);
        toast.error(error.message || t('errors.failed'));
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
  }, [taskId, isGenerating, generationStartTime, t, fetchUserCredits]);

  async function handleGenerate() {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    if (!product.trim()) {
      toast.error(t('errors.product_required'));
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
          scene: 'text-to-image',
          provider: PROVIDER,
          model: MODEL,
          prompt: composedPrompt,
          options: {
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
        throw new Error(result.message || t('errors.failed'));
      }

      if (!result.data?.id) {
        throw new Error(t('errors.failed'));
      }

      setTaskId(result.data.id);
      setProgress(25);
      fetchUserCredits();
    } catch (error: any) {
      setIsGenerating(false);
      setProgress(0);
      setTaskStatus(null);
      toast.error(error.message || t('errors.failed'));
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
                  <Badge variant="outline">{MODEL}</Badge>
                </div>
                <CardTitle className="mt-3 flex items-center gap-2 text-2xl">
                  <Package2 className="size-5" />
                  {t('title')}
                </CardTitle>
                <CardDescription>{t('description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="product-name">{t('fields.product')}</Label>
                  <Input
                    id="product-name"
                    value={product}
                    onChange={(event) => setProduct(event.target.value)}
                    placeholder={t('fields.product_placeholder')}
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="product-details">{t('fields.details')}</Label>
                    <Textarea
                      id="product-details"
                      value={details}
                      onChange={(event) => setDetails(event.target.value)}
                      placeholder={t('fields.details_placeholder')}
                      rows={5}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="brand-color">{t('fields.brand_color')}</Label>
                    <Input
                      id="brand-color"
                      value={brandColor}
                      onChange={(event) => setBrandColor(event.target.value)}
                      placeholder={t('fields.brand_color_placeholder')}
                    />
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      {t('fields.tip')}
                    </div>
                  </div>
                </div>

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
                    <Select
                      value={quality}
                      onValueChange={(value) =>
                        setQuality(value as (typeof QUALITY_OPTIONS)[number])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALITY_OPTIONS.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>{t('fields.thinking')}</Label>
                    <Select
                      value={thinkingLevel}
                      onValueChange={(value) =>
                        setThinkingLevel(
                          value as (typeof THINKING_OPTIONS)[number]
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THINKING_OPTIONS.map((item) => (
                          <SelectItem key={item} value={item}>
                            {t(`thinking.${item}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <WandSparkles className="size-4" />
                    {t('prompt_preview')}
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {composedPrompt || t('empty_prompt')}
                  </p>
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
