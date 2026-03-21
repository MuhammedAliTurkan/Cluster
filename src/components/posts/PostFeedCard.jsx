// Instagram tarzı feed kartı
import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { postApi } from "../../services/postApi";
import Avatar from "../common/Avatar";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}g`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export default function PostFeedCard({ post, onOpenDetail, onUpdate }) {
  const { user } = useAuth();
  const meId = useMemo(() => user?.id, [user]);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [imgIdx, setImgIdx] = useState(0);
  const [likeAnim, setLikeAnim] = useState(false);

  const images = post.images || [];
  const creator = post.creator;

  const toggleLike = async () => {
    try {
      const res = await postApi.toggleLike(post.id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
      if (res.liked) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 600); }
      onUpdate?.();
    } catch {}
  };

  // Çift tıkla beğen
  const handleDoubleClick = () => {
    if (!liked) toggleLike();
    else { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 600); }
  };

  return (
    <div className="bg-surface-2 border border-border-light/30 rounded-2xl overflow-hidden">
      {/* Header — profil */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Avatar src={creator?.avatarUrl} name={creator?.displayName || creator?.username} size={32} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white truncate">{creator?.displayName || creator?.username}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            {post.serverName && <span>{post.serverName}</span>}
            <span>·</span>
            <span>{timeAgo(post.createdAt)}</span>
            {post.visibility === "PUBLIC" && (
              <>
                <span>·</span>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 text-emerald-400 inline">
                  <circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c2 2 3 4 3 6s-1 4-3 6M8 2c-2 2-3 4-3 6s1 4 3 6"/>
                </svg>
              </>
            )}
          </div>
        </div>
        <button onClick={() => onOpenDetail?.(post)} className="p-1.5 text-gray-500 hover:text-white transition rounded-lg hover:bg-surface-3">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/>
          </svg>
        </button>
      </div>

      {/* Görsel — carousel */}
      <div className="relative bg-black select-none" onDoubleClick={handleDoubleClick}>
        {images.length > 0 ? (
          <img
            src={images[imgIdx]?.imageUrl}
            alt=""
            className="w-full aspect-square object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full aspect-square flex items-center justify-center bg-surface-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-gray-600">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        )}

        {/* Carousel ok */}
        {images.length > 1 && (
          <>
            {imgIdx > 0 && (
              <button onClick={() => setImgIdx((i) => i - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M10 3L5 8l5 5" strokeLinecap="round"/></svg>
              </button>
            )}
            {imgIdx < images.length - 1 && (
              <button onClick={() => setImgIdx((i) => i + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M6 3l5 5-5 5" strokeLinecap="round"/></svg>
              </button>
            )}
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition ${i === imgIdx ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
          </>
        )}

        {/* Çift tık kalp animasyonu */}
        {likeAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg viewBox="0 0 20 20" fill="white" className="w-20 h-20 animate-ping opacity-80" style={{ animationDuration: "0.5s", animationIterationCount: 1 }}>
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
          </div>
        )}
      </div>

      {/* Aksiyon butonları */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button onClick={toggleLike} className="group">
          {liked ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-rose-500 transition-transform active:scale-125">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-gray-300 group-hover:text-rose-400 transition">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
          )}
        </button>
        <button onClick={() => onOpenDetail?.(post)} className="group">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-gray-300 group-hover:text-white transition">
            <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" />
          </svg>
        </button>
      </div>

      {/* Beğeni sayısı */}
      {likeCount > 0 && (
        <div className="px-4 pb-1">
          <span className="text-[13px] font-semibold text-white">{likeCount} beğeni</span>
        </div>
      )}

      {/* Açıklama */}
      {post.description && (
        <div className="px-4 pb-2.5">
          <span className="text-[13px] text-gray-200">
            <span className="font-semibold text-white mr-1.5">{creator?.username}</span>
            {post.description}
          </span>
        </div>
      )}

      {/* Yorum sayısı */}
      {post.commentCount > 0 && (
        <button onClick={() => onOpenDetail?.(post)} className="px-4 pb-3 text-[12px] text-gray-500 hover:text-gray-300 transition">
          {post.commentCount} yorumun tümünü gör
        </button>
      )}
    </div>
  );
}
