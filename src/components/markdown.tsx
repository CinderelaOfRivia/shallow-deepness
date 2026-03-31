import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose prose-invert prose-lg prose-headings:tracking-tight prose-p:leading-8 prose-li:leading-8 prose-hr:my-10 max-w-none prose-deep">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}
