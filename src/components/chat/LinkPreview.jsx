// src/components/chat/LinkPreview.jsx
import { useEffect, useState, useRef } from "react";
import { api } from "../../context/AuthContext";

// URL regex — markdown link syntax'ını ve trailing punctuation'ı hariç tut
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]()]+[^\s<>"{}|\\^`\[\]().,;:!?'")\]]/gi;

// In-memory cache (session boyunca)
const previewCache = new Map();
const failedUrls = new Set();

export function extractUrls(text) {
  if (!text) return [];
  // Markdown link syntax içindeki URL'leri de yakala ama markdown içeriğinden temizle
  // Önce code block ve inline code içindeki URL'leri kaldır
  const cleaned = text
    .replace(/```[\s\S]*?```/g, "")   // code block
    .replace(/`[^`]+`/g, "");          // inline code
  const matches = cleaned.match(URL_REGEX);
  if (!matches) return [];
  // Sondaki parantez/noktalama temizliği + tekrar kaldır
  const clean = matches.map((u) => u.replace(/[)}\]]+$/, "").replace(/[.,;:!?'"]+$/, ""));
  return [...new Set(clean)].slice(0, 3);
}

function SinglePreview({ url }) {
  const [data, setData] = useState(() => previewCache.get(url) || null);
  const [loading, setLoading] = useState(!data && !failedUrls.has(url));
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (data || failedUrls.has(url)) { setLoading(false); return; }

    let alive = true;
    (async () => {
      try {
        const res = await api.get("/api/link-preview", { params: { url } });
        if (!alive) return;
        // 204 veya boş data
        if (!res.data || res.status === 204 || Object.keys(res.data).length === 0) {
          failedUrls.add(url);
          setLoading(false);
          return;
        }
        previewCache.set(url, res.data);
        setData(res.data);
      } catch (err) {
        // 204 No Content axios'ta error olabilir veya boş response
        if (err?.response?.status === 204 || err?.response?.status === 404) {
          failedUrls.add(url);
        } else {
          // Network error vb. — 30sn sonra tekrar denenebilsin
          setTimeout(() => failedUrls.delete(url), 30000);
          failedUrls.add(url);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [url, data]);

  if (loading) {
    return (
      <div className="mt-2 rounded-lg bg-black/10 border border-white/5 p-3 animate-pulse max-w-sm">
        <div className="h-3 w-32 bg-white/10 rounded mb-2" />
        <div className="h-2.5 w-48 bg-white/5 rounded" />
      </div>
    );
  }

  if (!data) return null;

  const { title, description, image, siteName, favicon } = data;
  if (!title && !description && !image) return null;
  const hasImage = image && !imgError;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 rounded-lg bg-black/15 border-l-4 border-accent/40 overflow-hidden hover:bg-black/20 transition group/lp no-underline max-w-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex">
        {/* Sol: metin */}
        <div className="flex-1 min-w-0 px-3 py-2.5">
          {/* Site adı + favicon */}
          {(siteName || favicon) && (
            <div className="flex items-center gap-1.5 mb-1">
              {favicon && (
                <img
                  src={favicon}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              )}
              {siteName && (
                <span className="text-[10px] text-white/40 uppercase tracking-wide truncate">{siteName}</span>
              )}
            </div>
          )}

          {/* Başlık */}
          {title && (
            <div className="text-[13px] font-medium text-accent-light group-hover/lp:underline leading-tight line-clamp-2">
              {title}
            </div>
          )}

          {/* Açıklama */}
          {description && (
            <p className="text-[11px] text-white/50 mt-1 leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Sağ: küçük thumbnail (varsa) */}
        {hasImage && (
          <div className="shrink-0 w-20 h-20 m-2.5 rounded-md overflow-hidden">
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          </div>
        )}
      </div>
    </a>
  );
}

export default function LinkPreview({ text }) {
  const urls = extractUrls(text);
  if (urls.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {urls.map((url) => (
        <SinglePreview key={url} url={url} />
      ))}
    </div>
  );
}
