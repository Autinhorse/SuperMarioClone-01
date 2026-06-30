import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders a Markdown string in the platform's cartoon-notebook style. Element
// styling is mapped here rather than via a typography plugin so the look stays
// consistent with the hand-rolled pages (about/terms/privacy).
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-5 text-ink/85 leading-relaxed text-base">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display font-bold text-3xl mt-8 mb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display font-bold text-2xl mt-8 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display font-bold text-xl mt-6 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => <p>{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="font-semibold text-brand-purple underline underline-offset-2 decoration-1 hover:opacity-70 transition"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-2">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-brand-coral bg-white/60 rounded-r-xl pl-4 pr-4 py-2 italic text-ink/80">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-ink">{children}</strong>
          ),
          hr: () => <hr className="border-t-2 border-ink/15 my-8" />,
          code: ({ children }) => (
            <code className="rounded bg-ink/10 px-1.5 py-0.5 font-mono text-sm">
              {children}
            </code>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === "string" ? src : ""}
              alt={alt ?? ""}
              className="rounded-2xl border-2 border-ink shadow-[4px_4px_0_0_var(--color-ink)] my-4"
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
