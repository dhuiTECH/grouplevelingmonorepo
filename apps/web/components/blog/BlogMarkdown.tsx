"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function BlogMarkdown({ content }: { content: string }) {
  return (
    <div
      className="max-w-none space-y-4 text-[15px] leading-relaxed text-slate-200
      [&_a]:text-cyan-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-cyan-300
      [&_h1]:mt-10 [&_h1]:text-3xl [&_h1]:font-black [&_h1]:text-white md:[&_h1]:text-4xl
      [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-white/10 [&_h2]:pb-2 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white md:[&_h2]:text-3xl
      [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-white md:[&_h3]:text-2xl
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
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
