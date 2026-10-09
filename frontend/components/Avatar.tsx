function hue(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface"
      style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${hue(name)} 60% 46%)` }}
    >
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  return (
    <div className="flex -space-x-2">
      {shown.map((n) => <Avatar key={n} name={n} />)}
      {names.length > max && (
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand ring-2 ring-surface">
          +{names.length - max}
        </span>
      )}
    </div>
  );
}