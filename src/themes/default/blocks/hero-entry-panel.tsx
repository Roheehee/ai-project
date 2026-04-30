'use client';

import { ReactNode, useState } from 'react';
import { ArrowRight, ImageIcon, Palette, Sparkles } from 'lucide-react';

import { useRouter } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group';
import { cn } from '@/shared/lib/utils';

type EntryOption = {
  value: string;
  label: string;
};

type EntryPanelProps = {
  section: {
    title?: string;
    description?: string;
    placeholder?: string;
    default_product?: string;
    submit_label?: string;
    examples_label?: string;
    examples?: string[];
    style_label?: string;
    styles?: EntryOption[];
    background_label?: string;
    backgrounds?: EntryOption[];
    ratio_label?: string;
    ratios?: EntryOption[];
    bullets?: string[];
    badge?: string;
    note?: string;
  };
  className?: string;
};

export function HeroEntryPanel({ section, className }: EntryPanelProps) {
  const router = useRouter();
  const styles = section.styles || [];
  const backgrounds = section.backgrounds || [];
  const ratios = section.ratios || [];

  const [product, setProduct] = useState(section.default_product || '');
  const [style, setStyle] = useState(styles[0]?.value || 'clean');
  const [background, setBackground] = useState(
    backgrounds[0]?.value || 'white'
  );
  const [ratio, setRatio] = useState(ratios[0]?.value || '1:1');

  function handleSubmit() {
    const query = new URLSearchParams({
      product: product.trim() || section.default_product || '',
      style,
      background,
      ratio,
    });

    router.push(`/ai-product-image-generator?${query.toString()}`);
  }

  return (
    <div
      className={cn(
        'border-border/70 bg-background/92 shadow-foreground/5 rounded-[1.75rem] border p-5 shadow-2xl backdrop-blur md:p-7',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {section.badge ? (
          <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1">
            <Sparkles className="size-3.5" />
            {section.badge}
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 space-y-2 text-center">
        {section.title ? (
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            {section.title}
          </h2>
        ) : null}
        {section.description ? (
          <p className="text-muted-foreground mx-auto max-w-2xl text-sm leading-6">
            {section.description}
          </p>
        ) : null}
      </div>

      <div className="mt-5 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="hero-product-name">{section.placeholder}</Label>
          <Input
            id="hero-product-name"
            value={product}
            onChange={(event) => setProduct(event.target.value)}
            placeholder={section.placeholder}
            className="h-11"
          />
        </div>

        {section.examples?.length ? (
          <div className="space-y-2">
            {section.examples_label ? (
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-[0.16em]">
                {section.examples_label}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {section.examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setProduct(example)}
                  className="border-border bg-background hover:bg-muted inline-flex rounded-full border px-3 py-1.5 text-sm transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {styles.length ? (
          <OptionGroup
            icon={<Palette className="size-4" />}
            label={section.style_label}
            value={style}
            onChange={setStyle}
            options={styles}
          />
        ) : null}

        {backgrounds.length ? (
          <OptionGroup
            icon={<ImageIcon className="size-4" />}
            label={section.background_label}
            value={background}
            onChange={setBackground}
            options={backgrounds}
          />
        ) : null}

        {ratios.length ? (
          <OptionGroup
            label={section.ratio_label}
            value={ratio}
            onChange={setRatio}
            options={ratios}
            compact
          />
        ) : null}

        <Button className="h-11 w-full rounded-xl" onClick={handleSubmit}>
          {section.submit_label}
          <ArrowRight className="size-4" />
        </Button>

        {section.bullets?.length ? (
          <div className="grid gap-2 rounded-2xl bg-muted/60 p-4">
            {section.bullets.map((bullet) => (
              <div
                key={bullet}
                className="text-foreground/85 flex items-start gap-2 text-sm"
              >
                <span className="mt-1 size-1.5 rounded-full bg-orange-500" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        ) : null}

        {section.note ? (
          <p className="text-muted-foreground text-xs leading-5">
            {section.note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function OptionGroup({
  icon,
  label,
  value,
  onChange,
  options,
  compact = false,
}: {
  icon?: ReactNode;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: EntryOption[];
  compact?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {label ? (
        <div className="text-foreground flex items-center gap-2 text-sm font-medium">
          {icon}
          <span>{label}</span>
        </div>
      ) : null}
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(nextValue) => nextValue && onChange(nextValue)}
        variant="outline"
        className={cn(
          'grid w-full gap-2',
          compact ? 'grid-cols-4' : 'grid-cols-2'
        )}
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className={cn(
              'h-auto min-h-10 rounded-xl border px-3 py-2 text-sm',
              compact && 'px-2'
            )}
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
