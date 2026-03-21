// Feed sayfasinin sol/sag sidebar icerikleri + reklam componentleri
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { postApi } from "../../services/postApi";
import Avatar from "../common/Avatar";

/** Trending postlar karti */
export function TrendingPosts({ onOpenPost }) {
  const [posts, setPosts] = useState([]);
  useEffect(() => { postApi.trending(5).then(setPosts).catch(() => {}); }, []);
  if (posts.length === 0) return null;

  return (
    <div className="bg-surface-2 rounded-2xl border border-border-light/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-amber-400">
          <path d="M8 0l2.1 5.3L16 6l-4 4.3L13 16l-5-3.2L3 16l1-5.7L0 6l5.9-.7z"/>
        </svg>
        <h3 className="text-sm font-semibold text-white">Populer</h3>
      </div>
      <div className="divide-y divide-border/20">
        {posts.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpenPost?.(p)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-3/50 transition text-left"
          >
            {p.images?.[0]?.imageUrl ? (
              <img src={p.images[0].imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-surface-4 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-gray-300 truncate">{p.creator?.displayName || p.creator?.username}</div>
              <div className="text-[11px] text-gray-500 truncate">{p.description || "Gonderi"}</div>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-600">
                <span className="flex items-center gap-0.5">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-rose-400">
                    <path d="M2.5 4.5a3 3 0 014.24 0L8 5.76l1.26-1.26a3 3 0 114.24 4.24L8 14.24l-5.5-5.5a3 3 0 010-4.24z"/>
                  </svg>
                  {p.likeCount}
                </span>
                <span className="flex items-center gap-0.5">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-gray-500">
                    <path d="M14 8c0 3-2.7 5.5-6 5.5a6.6 6.6 0 01-3-.7L1 14l1-2.3A5.2 5.2 0 012 8c0-3 2.7-5.5 6-5.5S14 5 14 8z"/>
                  </svg>
                  {p.commentCount}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Onerilen sunucular karti */
export function SuggestedServers() {
  const [servers, setServers] = useState([]);
  const nav = useNavigate();
  useEffect(() => { postApi.suggestedServers(5).then(setServers).catch(() => {}); }, []);
  if (servers.length === 0) return null;

  return (
    <div className="bg-surface-2 rounded-2xl border border-border-light/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-emerald-400">
          <path d="M8 0a8 8 0 110 16A8 8 0 018 0zm.5 3.5a.5.5 0 00-1 0v5a.5.5 0 00.25.43l3 1.75a.5.5 0 10.5-.86L8.5 8.14V3.5z"/>
        </svg>
        <h3 className="text-sm font-semibold text-white">Onerilen Sunucular</h3>
      </div>
      <div className="divide-y divide-border/20">
        {servers.map((s) => (
          <button
            key={s.id}
            onClick={() => nav("/app/discover")}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-3/50 transition text-left"
          >
            {s.iconUrl ? (
              <img src={s.iconUrl} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-surface-5 grid place-items-center shrink-0">
                <span className="text-[13px] font-bold text-gray-400">{(s.name || "?")[0].toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-200 truncate">{s.name}</div>
              <div className="text-[11px] text-gray-500 truncate">{s.description || `${s.memberCount || 0} uye`}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Sponsorlu Banner — feed'in en ustunde veya sidebar'da gosterilir */
export function SponsoredBanner({ ad, variant = "feed" }) {
  // ad = { title, description, imageUrl, targetUrl, ctaText, advertiser }
  // variant = "feed" (genis) | "sidebar" (dar)

  if (!ad) return <AdPlaceholder />;

  const handleClick = () => {
    if (ad.targetUrl) window.open(ad.targetUrl, "_blank", "noopener");
  };

  if (variant === "sidebar") {
    return (
      <div className="bg-surface-2 rounded-2xl border border-border-light/30 overflow-hidden">
        {ad.imageUrl && (
          <img src={ad.imageUrl} alt="" className="w-full aspect-[16/9] object-cover cursor-pointer" onClick={handleClick} />
        )}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">Sponsorlu</span>
          </div>
          <div className="text-[13px] font-semibold text-white mb-1 line-clamp-2">{ad.title}</div>
          {ad.description && <div className="text-[11px] text-gray-500 line-clamp-2 mb-2">{ad.description}</div>}
          <button onClick={handleClick}
            className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition">
            {ad.ctaText || "Daha Fazla"}
          </button>
        </div>
      </div>
    );
  }

  // Feed variant — genis banner
  return (
    <div className="bg-surface-2 border border-border-light/30 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/20">
        <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">Sponsorlu</span>
        {ad.advertiser && <span className="text-[11px] text-gray-500">{ad.advertiser}</span>}
      </div>
      {ad.imageUrl && (
        <img src={ad.imageUrl} alt="" className="w-full aspect-[21/9] object-cover cursor-pointer" onClick={handleClick} />
      )}
      <div className="px-4 py-3">
        <div className="text-[15px] font-semibold text-white mb-1">{ad.title}</div>
        {ad.description && <div className="text-[12px] text-gray-400 mb-3 line-clamp-2">{ad.description}</div>}
        <button onClick={handleClick}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition">
          {ad.ctaText || "Daha Fazla"}
        </button>
      </div>
    </div>
  );
}

/** Sponsorlu Post — feed icinde normal post gibi gosterilir */
export function SponsoredPostCard({ ad }) {
  if (!ad) return null;

  const handleClick = () => {
    if (ad.targetUrl) window.open(ad.targetUrl, "_blank", "noopener");
  };

  return (
    <div className="bg-surface-2 border border-border-light/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        {ad.advertiserAvatar ? (
          <img src={ad.advertiserAvatar} className="w-8 h-8 rounded-full object-cover" alt="" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600 grid place-items-center">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-white">
              <path d="M8 1l2 3h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z"/>
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white truncate">{ad.advertiser || "Sponsorlu"}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className="text-blue-400 font-medium">Sponsorlu</span>
          </div>
        </div>
      </div>

      {/* Gorsel */}
      {ad.imageUrl && (
        <img src={ad.imageUrl} alt="" className="w-full aspect-square object-cover cursor-pointer" onClick={handleClick} />
      )}

      {/* CTA */}
      <div className="px-4 py-3">
        <div className="text-[14px] font-semibold text-white mb-1">{ad.title}</div>
        {ad.description && <div className="text-[12px] text-gray-400 mb-3">{ad.description}</div>}
        <button onClick={handleClick}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition">
          {ad.ctaText || "Hemen Incele"}
        </button>
      </div>
    </div>
  );
}

/**
 * AdSense In-Feed reklam — postlar arasinda kucuk gosterilir
 * AdSense onaylaninca ca-pub ve slot degerlerini degistir
 */
export function AdSenseInFeed({ adClient = "ca-pub-XXXXXXX", adSlot = "XXXXXXX" }) {
  const ref = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      if (window.adsbygoogle && ref.current) {
        window.adsbygoogle.push({});
        pushed.current = true;
      }
    } catch {}
  }, []);

  // AdSense yuklenmemisse placeholder goster
  if (!window.adsbygoogle) {
    return (
      <div className="bg-surface-2/50 border border-border-light/20 rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-surface-4 grid place-items-center shrink-0">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-4 h-4 text-gray-600">
            <rect x="2" y="2" width="12" height="12" rx="2"/><path d="M2 10l3-3 3 3 3-5 3 5"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-gray-600">Sponsorlu icerik</div>
        </div>
        <span className="text-[9px] text-gray-700 bg-surface-3 px-1.5 py-0.5 rounded">Ad</span>
      </div>
    );
  }

  return (
    <div className="bg-surface-2/50 border border-border-light/20 rounded-xl overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <span className="text-[9px] text-gray-600 bg-surface-3 px-1.5 py-0.5 rounded">Ad</span>
      </div>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="fluid"
        data-ad-layout-key="-6t+ed+2i-1n-4w"
      />
    </div>
  );
}

/**
 * Sidebar reklam alani — sunucu sahiplerine direkt satis
 * Reklam yoksa "Bu alana reklam verebilirsiniz" gosterir
 */
export function SidebarAdSlot({ ad, contactUrl = "#" }) {
  if (ad) return <SponsoredBanner ad={ad} variant="sidebar" />;

  return (
    <div className="bg-surface-2 rounded-2xl border border-border-light/20 overflow-hidden">
      <div className="p-4 flex flex-col items-center text-center">
        <div className="w-full aspect-[4/3] rounded-xl bg-gradient-to-br from-surface-3 to-surface-4 flex flex-col items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-surface-5 grid place-items-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-7 h-7 text-gray-500">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 16l5-5 4 4 4-6 5 7"/>
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-gray-300">Reklam Alani</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Bu alana reklam verebilirsiniz</div>
          </div>
        </div>
        <a
          href={contactUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-medium transition border border-blue-500/20"
        >
          Iletisime Gec
        </a>
      </div>
    </div>
  );
}

/** Reklam placeholder — fallback */
export function AdPlaceholder({ label }) {
  return (
    <div className="bg-surface-2 rounded-2xl border border-border-light/20 p-4 text-center">
      <div className="w-full aspect-[4/3] rounded-xl bg-surface-3 flex flex-col items-center justify-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-8 h-8 text-gray-700">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 16l5-5 4 4 4-6 5 7"/>
        </svg>
        <span className="text-[10px] text-gray-600">{label || "Reklam Alani"}</span>
      </div>
    </div>
  );
}
