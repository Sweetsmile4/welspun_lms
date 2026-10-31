import type { Content } from './model';
export function ContentView({ content }: { content: Content }) {
  if (content.type === 'text')
    return <p className="mt-2 whitespace-pre-wrap text-sm">{content.text}</p>;
  return (
    <div className="mt-2 space-y-2 text-sm">
      {content.blocks.map((b, i) =>
        b.type === 'list' ? (
          <ul key={i} className="list-disc pl-5">
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : b.type === 'heading' ? (
          <p key={i} className="font-bold">
            {b.text}
          </p>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {b.text}
          </p>
        ),
      )}
    </div>
  );
}
