import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { postApi } from "../../services/postApi";
import PostFeedCard from "./PostFeedCard";
import PostDetailModal from "./PostDetailModal";
import CreatePostModal from "./CreatePostModal";
import { SponsoredBanner } from "./FeedSidebar";

// Demo sunucu ici reklam — ileride sunucu sahibi ServerSettings'ten yonetecek
const DEMO_SERVER_AD = {
  title: "Sunucumuza ozel etkinlik!",
  description: "Bu hafta sonu turnuvamiza katil, oduller seni bekliyor.",
  imageUrl: null,
  targetUrl: "#",
  ctaText: "Katil",
  advertiser: "Sunucu Yoneticisi",
};

export default function ServerPostsView({ serverId, channelTitle }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("all");
  const [posts, setPosts] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadPosts = useCallback(async (p = 0, append = false) => {
    if (p === 0) setLoading(true);
    try {
      const data = await postApi.listServerPosts(serverId, p);
      const items = data.content || [];
      setPosts((prev) => append ? [...prev, ...items] : items);
      setHasMore(items.length >= 20);
      setPage(p);
    } catch (e) {
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  const loadPending = useCallback(async () => {
    try {
      const data = await postApi.listPending(serverId);
      setPendingPosts(Array.isArray(data) ? data : []);
    } catch {
      setPendingPosts([]);
    }
  }, [serverId]);

  useEffect(() => {
    if (serverId) { loadPosts(0); loadPending(); }
  }, [serverId, loadPosts, loadPending]);

  const visiblePosts = tab === "pending" ? pendingPosts : posts;

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <svg viewBox="0 0 16 16" className="w-4.5 h-4.5 text-pink-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="2" y="2" width="12" height="12" rx="2"/><circle cx="5.5" cy="5.5" r="1"/><path d="M14 10l-3.5-3.5L4 13"/>
              </svg>
              <h1 className="text-lg font-bold text-white">{channelTitle || "Gonderiler"}</h1>
            </div>
            <p className="text-[12px] text-gray-500 ml-6">Gonderi paylas, begeni ve yorum yap</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-medium transition flex items-center gap-1.5 shadow-lg shadow-pink-600/20"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
            </svg>
            Yeni Gonderi
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-surface-3 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === "all" ? "bg-accent text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            Tum Gonderiler
          </button>
          <button
            onClick={() => { setTab("pending"); loadPending(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
              tab === "pending" ? "bg-amber-600 text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            Onay Bekleyenler
            {pendingPosts.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {pendingPosts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading && posts.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-surface-4 grid place-items-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10 text-gray-600">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
            <div className="text-lg font-semibold text-gray-400 mb-1">
              {tab === "pending" ? "Onay bekleyen gonderi yok" : "Henuz gonderi yok"}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              {tab === "all" ? "Ilk gonderiyi paylasarak baslat!" : ""}
            </div>
            {tab === "all" && (
              <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-medium transition shadow-lg shadow-pink-600/20">
                Ilk gonderiyi paylas
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="max-w-lg mx-auto space-y-5">
              {/* Sponsorlu banner — en ustte */}
              {tab === "all" && visiblePosts.length > 0 && (
                <SponsoredBanner ad={DEMO_SERVER_AD} variant="feed" />
              )}

              {visiblePosts.map((p) => (
                <div key={p.id} className="relative">
                  <PostFeedCard post={p} onOpenDetail={setSelectedPost} onUpdate={() => { loadPosts(0); loadPending(); }} />
                  {p.publicStatus && p.publicStatus !== "NONE" && p.publicStatus !== "APPROVED" && (
                    <div className={`absolute top-14 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      p.publicStatus.startsWith("PENDING") ? "bg-amber-500/90 text-white" : "bg-rose-500/90 text-white"
                    }`}>
                      {p.publicStatus.startsWith("PENDING") ? "Onay Bekliyor" : "Reddedildi"}
                    </div>
                  )}
                  {p.visibility === "PUBLIC" && (
                    <div className="absolute top-14 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/90 text-white">
                      Public
                    </div>
                  )}
                </div>
              ))}
            </div>
            {tab === "all" && hasMore && (
              <div className="flex justify-center mt-6">
                <button onClick={() => loadPosts(page + 1, true)}
                  className="px-6 py-2.5 rounded-xl bg-surface-3 hover:bg-surface-4 text-sm text-gray-300 transition">
                  Daha fazla yukle
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdate={() => { loadPosts(0); loadPending(); }}
          serverId={serverId}
        />
      )}
      {showCreate && (
        <CreatePostModal
          serverId={serverId}
          onCreated={() => loadPosts(0)}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
