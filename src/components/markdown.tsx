import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose prose-invert max-w-none prose-headings:tracking-tight prose-p:text-slate-200 prose-li:text-slate-200 prose-strong:text-white prose-a:text-cyan-300">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}
