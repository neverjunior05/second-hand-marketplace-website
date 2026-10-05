/* eslint-disable @next/next/no-img-element */
/** Cover image with a typographic fallback (no external image optimizer needed). */
export function BookImage({
  src,
  title,
  author,
  className = "",
}: {
  src?: string | null;
  title: string;
  author?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={`Cover of ${title}`}
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className={`flex h-full w-full flex-col justify-between bg-brand-soft p-3 ${className}`}
      aria-label={`No cover image for ${title}`}
    >
      <span className="font-display text-sm leading-tight text-brand">{title}</span>
      {author ? <span className="text-[10px] uppercase tracking-wide text-ink-soft">{author}</span> : null}
    </div>
  );
}
