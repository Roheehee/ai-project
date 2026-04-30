import Link from 'next/link';

import { Button } from '@/shared/components/ui/button';

export function BuiltWith() {
  return (
    <Button asChild variant="outline" size="sm" className="hover:bg-primary/10">
      <Link href="/ai-product-image-generator" target="_self">
        Built for product hero images
      </Link>
    </Button>
  );
}
