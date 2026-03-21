// src/components/chat/MarkdownContent.jsx
import { useMemo, useState, Children, isValidElement, cloneElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

/**
 * Mesaj içeriğini Markdown olarak render eder.
 * - @mention vurgulama
 * - ||spoiler|| desteği
 * - Syntax highlighted kod blokları
 * - GFM: bold, italic, strikethrough, kod, kod bloğu, liste, tablo, blockquote
 */

// Placeholder regex'leri
const MENTION_PLACEHOLDER = /%%MENTION_(\d+)%%/;
const SPOILER_PLACEHOLDER = /%%SPOILER_(\d+)%%/;

// Spoiler component
function SpoilerText({ text }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
      className={`rounded px-0.5 cursor-pointer transition-all duration-200 ${
        revealed ? "bg-white/10 text-gray-200" : "bg-gray-600 text-transparent hover:bg-gray-500"
      }`}
    >
      {text}
    </span>
  );
}

function processPlaceholders(children, mentions, spoilers, myUsername) {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      if (!MENTION_PLACEHOLDER.test(child) && !SPOILER_PLACEHOLDER.test(child)) return child;
      const parts = child.split(/(%%(?:MENTION|SPOILER)_\d+%%)/g);
      return parts.map((part, i) => {
        if (mentions[part]) {
          const mentionText = mentions[part];
          const username = mentionText.slice(1);
          const isMe = myUsername && username.toLowerCase() === myUsername.toLowerCase();
          return (
            <span key={i} className={`rounded px-0.5 font-medium cursor-pointer ${
              isMe ? "bg-yellow-500/30 text-yellow-200" : "bg-accent/20 text-accent-light"
            }`}>{mentionText}</span>
          );
        }
        if (spoilers[part]) {
          return <SpoilerText key={i} text={spoilers[part]} />;
        }
        return part || null;
      });
    }
    if (isValidElement(child) && child.props?.children) {
      return cloneElement(child, {}, processPlaceholders(child.props.children, mentions, spoilers, myUsername));
    }
    return child;
  });
}

function WithPlaceholders({ children, mentions, spoilers, myUsername }) {
  return <>{processPlaceholders(children, mentions, spoilers, myUsername)}</>;
}

export default function MarkdownContent({ text, myId, myUsername, mine }) {
  const { processed, mentions, spoilers } = useMemo(() => {
    if (!text) return { processed: "", mentions: {}, spoilers: {} };
    const mentionMap = {};
    const spoilerMap = {};
    let mIdx = 0;
    let sIdx = 0;

    // @mention → placeholder
    let result = text.replace(/@(\S+)/g, (match) => {
      const key = `%%MENTION_${mIdx}%%`;
      mentionMap[key] = match;
      mIdx++;
      return key;
    });

    // ||spoiler|| → placeholder
    result = result.replace(/\|\|(.+?)\|\|/g, (_, inner) => {
      const key = `%%SPOILER_${sIdx}%%`;
      spoilerMap[key] = inner;
      sIdx++;
      return key;
    });

    return { processed: result, mentions: mentionMap, spoilers: spoilerMap };
  }, [text]);

  const components = useMemo(() => {
    const wrap = (Tag, className) => ({ children, node, ...rest }) => (
      <Tag className={className}>
        <WithPlaceholders mentions={mentions} spoilers={spoilers} myUsername={myUsername}>{children}</WithPlaceholders>
      </Tag>
    );

    return {
      p: ({ children }) => (
        <div className="mb-0.5 last:mb-0">
          <WithPlaceholders mentions={mentions} spoilers={spoilers} myUsername={myUsername}>{children}</WithPlaceholders>
        </div>
      ),

      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="text-blue-400 hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >{children}</a>
      ),

      pre: ({ children }) => (
        <pre className="my-1.5 rounded-lg overflow-x-auto text-[12px] whitespace-pre">
          {children}
        </pre>
      ),
      code: ({ className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || "");
        if (match) {
          return (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              customStyle={{ margin: 0, padding: "0.75rem", borderRadius: "0.5rem", fontSize: "12px", background: "rgba(0,0,0,0.3)" }}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          );
        }
        return (
          <code className="px-1 py-0.5 rounded bg-black/25 text-[12px] font-mono text-pink-300">
            {children}
          </code>
        );
      },

      strong: wrap("strong", "font-semibold text-white"),
      em: wrap("em", "italic"),
      del: wrap("del", "line-through text-white/50"),

      blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-white/20 pl-2.5 my-1 text-white/60 italic">
          {children}
        </blockquote>
      ),

      ul: ({ children }) => <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>,
      li: ({ children }) => (
        <li className="text-[14px]">
          <WithPlaceholders mentions={mentions} spoilers={spoilers} myUsername={myUsername}>{children}</WithPlaceholders>
        </li>
      ),

      table: ({ children }) => (
        <div className="overflow-x-auto my-1.5">
          <table className="min-w-full text-[12px] border-collapse">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-black/20">{children}</thead>,
      tbody: ({ children }) => <tbody>{children}</tbody>,
      tr: ({ children }) => <tr className="border-b border-white/5">{children}</tr>,
      th: ({ children }) => <th className="px-2 py-1 text-left font-medium text-white/70">{children}</th>,
      td: ({ children }) => (
        <td className="px-2 py-1 text-white/60">
          <WithPlaceholders mentions={mentions} spoilers={spoilers} myUsername={myUsername}>{children}</WithPlaceholders>
        </td>
      ),

      h1: wrap("div", "text-[17px] font-bold mt-1 mb-0.5"),
      h2: wrap("div", "text-[16px] font-bold mt-1 mb-0.5"),
      h3: wrap("div", "text-[15px] font-semibold mt-1 mb-0.5"),
      h4: wrap("div", "text-[14px] font-semibold mt-1 mb-0.5"),

      hr: () => <hr className="border-white/10 my-2" />,

      img: ({ src, alt }) => (
        <img src={src} alt={alt || ""} className="max-w-full max-h-60 rounded-lg my-1 object-contain" loading="lazy" />
      ),
    };
  }, [mentions, spoilers, myUsername]);

  if (!text) return null;

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {processed}
    </ReactMarkdown>
  );
}
