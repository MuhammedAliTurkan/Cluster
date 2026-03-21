import { useEffect, useState, useCallback, useRef } from "react";
import { postApi } from "../services/postApi";
import PostFeedCard from "../components/posts/PostFeedCard";
import PostDetailModal from "../components/posts/PostDetailModal";
import { TrendingPosts, SuggestedServers, SponsoredBanner, SponsoredPostCard, AdSenseInFeed, SidebarAdSlot } from "../components/posts/FeedSidebar";

// Demo reklam verileri — ileride backend'den gelecek
const DEMO_FEED_BANNER = {
  title: "Cluster Premium ile sunucunu yukselt",
  description: "Ozel temalar, daha fazla depolama ve oncelikli destek. Simdi %50 indirimle dene!",
  imageUrl: null,
  targetUrl: "#",
  ctaText: "Premium'a Gec",
  advertiser: "Cluster",
};

const DEMO_SPONSORED_POST = {
  title: "Yeni nesil iletisim platformu",
  description: "Ekibinle sesli, goruntulu ve yazili iletisimi tek yerde birlestir.",
  imageUrl: null,
  targetUrl: "#",
  ctaText: "Ucretsiz Baslat",
  advertiser: "Cluster for Teams",
  advertiserAvatar: null,
};

const DEMO_SIDEBAR_AD = {
  title: "Sunucunu ozellesir",
  description: "Premium temalar ve ozel bot entegrasyonlari",
  imageUrl: null,
  targetUrl: "#",
  ctaText: "Kesfet",
};

export default function PostFeedPage() {
  const [tab, setTab] = useState("feed");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [discoverScroll, setDiscoverScroll] = useState(null); // tiklanan post index'i — grid'den feed'e gec
  const scrollFeedRef = useRef(null);

  const loadPosts = useCallback(async (p = 0, append = false) => {
    if (p === 0) setLoading(true);
    try {
      const data = tab === "feed" ? await postApi.feed(p) : await postApi.discover(p);
      const items = data.content || [];
      setPosts((prev) => append ? [...prev, ...items] : items);
      setHasMore(items.length >= 20);
      setPage(p);
    } catch (e) {
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    setPosts([]);
    setPage(0);
    setDiscoverScroll(null);
    loadPosts(0);
  }, [tab, loadPosts]);

  // Postlar arasina reklam ekle: her 5 postta AdSense, 10. postta sponsorlu
  const feedWithAds = [];
  posts.forEach((p, i) => {
    feedWithAds.push({ type: "post", data: p });
    if ((i + 1) % 5 === 0 && (i + 1) % 10 !== 0) {
      feedWithAds.push({ type: "adsense", key: `adsense-${i}` });
    }
    if ((i + 1) % 10 === 0) {
      feedWithAds.push({ type: "sponsored", data: DEMO_SPONSORED_POST });
    }
  });

  return (
    <div className="h-full overflow-y-auto bg-surface-1">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex gap-6 justify-center">

          {/* Sol sidebar */}
          <div className="hidden xl:block w-64 shrink-0 space-y-4 sticky top-4 self-start">
            <TrendingPosts onOpenPost={setSelectedPost} />
            <SidebarAdSlot contactUrl="mailto:reklam@cluster.app" />
          </div>

          {/* Orta — feed */}
          <div className="w-full max-w-lg min-w-0">
            {/* Header */}
            <div className="mb-5">
              <h1 className="text-xl font-bold text-white mb-1">Gonderiler</h1>
              <p className="text-sm text-gray-500">Sunucularindaki son paylasimlar ve kesfet</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 mb-5 border-b border-border-light">
              {[
                { id: "feed", label: "Akis", icon: <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M2 1h12a1 1 0 011 1v12a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1zm1 2v4h4V3H3zm6 0v2h4V3H9zm-6 6v4h4V9H3zm6 0v2h4V9H9z"/></svg> },
                { id: "discover", label: "Kesfet", icon: <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M12 12l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-3 text-sm font-semibold text-center transition border-b-2 flex items-center justify-center gap-2 ${
                    tab === t.id
                      ? "text-white border-white"
                      : "text-gray-500 border-transparent hover:text-gray-300"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Loading */}
            {loading && posts.length === 0 ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-surface-4 grid place-items-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10 text-gray-600">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                </div>
                <div className="text-lg font-semibold text-gray-400 mb-1">
                  {tab === "feed" ? "Akis bos" : "Kesfedilecek gonderi yok"}
                </div>
                <div className="text-sm text-gray-600">
                  {tab === "feed"
                    ? "Sunuculara katilip gonderileri takip et!"
                    : "Henuz herkese acik gonderi yok."}
                </div>
              </div>

            /* ── KESFET: Kare Grid ── */
            ) : tab === "discover" && discoverScroll === null ? (
              <>
                <div className="grid grid-cols-3 gap-1">
                  {posts.map((p, i) => {
                    const img = p.images?.[0]?.imageUrl;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setDiscoverScroll(i)}
                        className="relative aspect-square bg-surface-3 overflow-hidden group"
                      >
                        {img ? (
                          <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-surface-4">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-gray-600">
                              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                            </svg>
                          </div>
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex items-center gap-3 text-white text-sm font-semibold">
                            <span className="flex items-center gap-1">
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
                              </svg>
                              {p.likeCount || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z"/>
                              </svg>
                              {p.commentCount || 0}
                            </span>
                          </div>
                        </div>
                        {/* Coklu gorsel ikonu */}
                        {p.images?.length > 1 && (
                          <div className="absolute top-2 right-2">
                            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-white drop-shadow">
                              <path d="M2 3h9v9H2V3zm3 3h9v9H5V6z" opacity="0.9"/>
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {hasMore && (
                  <div className="flex justify-center py-4">
                    <button onClick={() => loadPosts(page + 1, true)}
                      className="px-6 py-2.5 rounded-xl bg-surface-3 hover:bg-surface-4 text-sm text-gray-300 transition">
                      Daha fazla yukle
                    </button>
                  </div>
                )}
              </>

            /* ── KESFET: Dikey Feed (grid'den tiklayinca) ── */
            ) : tab === "discover" && discoverScroll !== null ? (
              <>
                <button
                  onClick={() => setDiscoverScroll(null)}
                  className="flex items-center gap-2 mb-4 text-sm text-gray-400 hover:text-white transition"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Grid'e don
                </button>
                <div className="space-y-5" ref={scrollFeedRef}>
                  {posts.slice(discoverScroll).map((p) => (
                    <PostFeedCard
                      key={p.id}
                      post={p}
                      onOpenDetail={setSelectedPost}
                      onUpdate={() => loadPosts(0)}
                    />
                  ))}
                  {hasMore && (
                    <div className="flex justify-center py-4">
                      <button onClick={() => loadPosts(page + 1, true)}
                        className="px-6 py-2.5 rounded-xl bg-surface-3 hover:bg-surface-4 text-sm text-gray-300 transition">
                        Daha fazla yukle
                      </button>
                    </div>
                  )}
                </div>
              </>

            /* ── AKIS: Normal feed ── */
            ) : (
              <>
                {/* Sponsorlu Banner */}
                {posts.length > 0 && (
                  <div className="mb-5">
                    <SponsoredBanner ad={DEMO_FEED_BANNER} variant="feed" />
                  </div>
                )}
                <div className="space-y-5">
                  {feedWithAds.map((item, i) => {
                    if (item.type === "adsense") return <AdSenseInFeed key={item.key} />;
                    if (item.type === "sponsored") return <SponsoredPostCard key={`sp-${i}`} ad={item.data} />;
                    return (
                      <PostFeedCard
                        key={item.data.id}
                        post={item.data}
                        onOpenDetail={setSelectedPost}
                        onUpdate={() => loadPosts(0)}
                      />
                    );
                  })}

                  {hasMore && (
                    <div className="flex justify-center py-4">
                      <button
                        onClick={() => loadPosts(page + 1, true)}
                        className="px-6 py-2.5 rounded-xl bg-surface-3 hover:bg-surface-4 text-sm text-gray-300 transition"
                      >
                        Daha fazla yukle
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sag sidebar */}
          <div className="hidden lg:block w-64 shrink-0 space-y-4 sticky top-4 self-start">
            <SuggestedServers />
            <SidebarAdSlot contactUrl="mailto:reklam@cluster.app" />
          </div>

        </div>
      </div>

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdate={() => loadPosts(0)}
        />
      )}
    </div>
  );
}
