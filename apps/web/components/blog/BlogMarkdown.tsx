"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

const markdownPrefix: Record<1 | 2 | 3, string> = {
  1: "# ",
  2: "## ",
  3: "### ",
};

function CopyableHeading({
  level,
  node: _node,
  children,
  className,
  ...rest
}: React.ComponentPropsWithoutRef<"h1"> & {
  level: 1 | 2 | 3;
  node?: unknown;
}) {
  const Tag = `h${level}` as const;
  const textRef = useRef<HTMLSpanElement>(null);
  const [copied, setCopied] = useState(false);

  const copyMarkdownHeading = useCallback(async () => {
    const el = textRef.current;
    if (!el) return;
    const text = el.innerText.replace(/\s+/g, " ").trim();
    if (!text) return;
    const line = `${markdownPrefix[level]}${text}`;
    try {
      await navigator.clipboard.writeText(line);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (permissions / non-secure context)
    }
  }, [level]);

  return (
    <div
      className={`group relative flex items-start gap-2 ${
        level === 3 ? "mt-8" : "mt-10"
      }`}
    >
      <Tag
        className={`min-w-0 flex-1 ${
          level === 1
            ? "text-3xl font-black text-white md:text-4xl"
            : level === 2
              ? "border-b border-white/10 pb-2 text-2xl font-bold text-white md:text-3xl"
              : "text-xl font-bold text-white md:text-2xl"
        } ${className ?? ""}`}
        {...rest}
      >
        <span ref={textRef} className="inline">
          {children}
        </span>
      </Tag>
      <button
        type="button"
        onClick={copyMarkdownHeading}
        title="Copy as markdown heading"
        aria-label={`Copy ${level === 1 ? "H1" : level === 2 ? "H2" : "H3"} as markdown`}
        className="mt-1.5 shrink-0 rounded border border-white/10 bg-slate-900/80 p-1.5 text-slate-400 opacity-0 shadow-sm transition hover:border-cyan-500/40 hover:text-cyan-300 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500/50 group-hover:opacity-100 md:mt-2"
      >
        {copied ? (
          <Check className="size-4 text-emerald-400" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}

const markdownComponents: Partial<Components> = {
  h1: (props) => <CopyableHeading level={1} {...props} />,
  h2: (props) => <CopyableHeading level={2} {...props} />,
  h3: (props) => <CopyableHeading level={3} {...props} />,
};

export default function BlogMarkdown({ content }: { content: string }) {
  // Ensure headings have a blank line before them so they don't get parsed as paragraph text
  const fixedContent = content.replace(/([^\n])\n(#+ )/g, "$1\n\n$2");

  return (
    <div
      className="max-w-none space-y-4 text-[15px] leading-relaxed text-slate-200
      [&_a]:text-cyan-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-cyan-300
      [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
      [&_li]:my-1
      [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-500/50 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400
      [&_code]:rounded [&_code]:bg-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-cyan-200
      [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-4 [&_pre]:text-sm
      [&_pre_code]:bg-transparent [&_pre_code]:p-0
      [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-white/15 [&_th]:bg-slate-900 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left
      [&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2
      [&_img]:mx-auto [&_img]:my-8 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-white/10 [&_img]:shadow-lg"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {fixedContent}
      </ReactMarkdown>
    </div>
  );
}
