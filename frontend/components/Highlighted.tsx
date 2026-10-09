export function Highlighted({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // split with a capture group puts the matches at the odd indexes
  return (
    <>
      {text.split(new RegExp(`(${escaped})`, "gi")).map((part, i) =>
        i % 2 === 1 ? <mark key={i} className="rounded bg-yellow-200 px-0.5 text-black">{part}</mark> : part,
      )}
    </>
  );
}