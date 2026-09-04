import Image from 'next/image';

/**
 * The official Narratix Labs brand mark.
 *
 * One source of truth for the supplied logo asset so the navbar, footer,
 * login and signup cards can never drift apart. The mark is purely visual —
 * every placement pairs it with the "Narratix Lab" wordmark in text — so it
 * is hidden from assistive technology by default.
 */
export default function BrandMark({
  size = 28,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/narratix-labs-mark.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}
