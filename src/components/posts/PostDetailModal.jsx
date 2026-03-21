import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { postApi } from "../../services/postApi";
import Avatar from "../common/Avatar";
import toast from "react-hot-toast";

function fmtTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function PostDetailModal({ post, onClose, onUpdate, serverId }) {
  const { user } = useAuth();
  const meId = useMemo(() => user?.id, [user]);
  const [currentImg, setCurrentImg] = useState(0);
  const [liked, setLiked] = useState(post?.likedByMe || false);
  const [likeCount, setLikeCount] = useState(post?.likeCount || 0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(true);
  const commentInputRef = useRef(null);

  const images = post?.images || [];

  useEffect(() => {
    if (!post?.id) return;
    setLoadingComments(true);
    postApi.listComments(post.id).then((data) => setComments(data.content || [])).catch(() => setComments([])).finally(() => setLoadingComments(false));
  }, [post?.id]);

  const toggleLike = async () => {
    try {
      const res = await postApi.toggleLike(post.id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
      onUpdate?.();
    } catch {}
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    try {
      const c = await postApi.addComment(post.id, text);
      setComments((prev) => [...prev, c]);
      setCommentText("");
      onUpdate?.();
    } catch {}
  };

  const deleteComment = async (commentId) => {
    try {
      await postApi.deleteComment(post.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onUpdate?.();
    } catch {}
  };

  // Public onay sistemi
  const [publicLoading, setPublicLoading] = useState(false);
  const isPostOwner = post?.creator?.id === meId;
  const publicStatus = post?.publicStatus || "NONE";
  const isPublic = post?.visibility === "PUBLIC";

  const requestPublic = async () => {
    setPublicLoading(true);
    try { await postApi.requestPublic(post.id); onUpdate?.(); } catch (e) { toast.error(e.response?.data?.error || "Hata"); }
    finally { setPublicLoading(false); }
  };
  const approvePublic = async () => {
    setPublicLoading(true);
    try { await postApi.approvePublic(post.id); onUpdate?.(); } catch (e) { toast.error(e.response?.data?.error || "Hata"); }
    finally { setPublicLoading(false); }
  };
  const rejectPublic = async () => {
    setPublicLoading(true);
    try { await postApi.rejectPublic(post.id); onUpdate?.(); } catch (e) { toast.error(e.response?.data?.error || "Hata"); }
    finally { setPublicLoading(false); }
  };

  if (!post) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-[99998]" onClick={onClose} />
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <div className="bg-surface-2 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-4xl max-h-[90vh] flex overflow-hidden border border-border-light">
          {/* Sol: resim carousel */}
          <div className="flex-1 min-w-0 bg-black flex items-center justify-center relative">
            {images.length > 0 ? (
              <>
                <img src={images[currentImg]?.imageUrl} alt="" className="max-w-full max-h-[90vh] object-contain" />
                {images.length > 1 && (
                  <>
                    {currentImg > 0 && (
                      <button onClick={() => setCurrentImg((i) => i - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M10 3L5 8l5 5" strokeLinecap="round"/></svg>
                      </button>
                    )}
                    {currentImg < images.length - 1 && (
                      <button onClick={() => setCurrentImg((i) => i + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M6 3l5 5-5 5" strokeLinecap="round"/></svg>
                      </button>
                    )}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button key={i} onClick={() => setCurrentImg(i)}
                          className={`w-2 h-2 rounded-full transition ${i === currentImg ? "bg-white" : "bg-white/40"}`} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-gray-600">Görsel yok</div>
            )}
          </div>

          {/* Sağ: bilgiler + yorumlar */}
          <div className="w-[340px] shrink-0 flex flex-col bg-surface-2">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
              <Avatar src={post.creator?.avatarUrl} name={post.creator?.displayName || post.creator?.username} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{post.creator?.displayName || post.creator?.username}</div>
                <div className="text-[10px] text-gray-500">{post.serverName} · {fmtTime(post.createdAt)}</div>
              </div>
              <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition shrink-0">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M4 4l8 8M12 4l-8 8"/></svg>
              </button>
            </div>

            {/* Açıklama */}
            {post.description && (
              <div className="px-4 py-3 border-b border-border/30">
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{post.description}</p>
              </div>
            )}

            {/* Beğeni + aksiyon butonları */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border/30">
              <button onClick={toggleLike} className="flex items-center gap-1.5 group">
                {liked ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-rose-500">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-gray-400 group-hover:text-rose-400 transition">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                )}
                <span className={`text-sm font-medium ${liked ? "text-rose-500" : "text-gray-400"}`}>{likeCount}</span>
              </button>
              <button onClick={() => commentInputRef.current?.focus()} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                  <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" />
                </svg>
                <span className="text-sm">{comments.length}</span>
              </button>
            </div>

            {/* Public durum / aksiyon */}
            {!isPublic && (
              <div className="px-4 py-2.5 border-b border-border/30">
                {publicStatus === "NONE" || publicStatus === "REJECTED" ? (
                  <button
                    onClick={requestPublic}
                    disabled={publicLoading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-3 hover:bg-surface-4 text-sm text-gray-300 transition disabled:opacity-50"
                  >
                      Keşfette Paylaş (Public Yap)
                    {publicStatus === "REJECTED" && <span className="text-[10px] text-rose-400">(önceki istek reddedildi)</span>}
                  </button>
                ) : publicStatus === "PENDING_OWNER" ? (
                  <div className="space-y-1.5">
                    <div className="text-[12px] text-amber-400">Sahip istedi, moderatör onayı bekleniyor</div>
                    {!isPostOwner && (
                      <div className="flex gap-2">
                        <button onClick={approvePublic} disabled={publicLoading} className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition disabled:opacity-50">Onayla</button>
                        <button onClick={rejectPublic} disabled={publicLoading} className="flex-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition disabled:opacity-50">Reddet</button>
                      </div>
                    )}
                  </div>
                ) : publicStatus === "PENDING_MOD" ? (
                  <div className="space-y-1.5">
                    <div className="text-[12px] text-amber-400">Moderatör istedi, sahip onayı bekleniyor</div>
                    {isPostOwner && (
                      <div className="flex gap-2">
                        <button onClick={approvePublic} disabled={publicLoading} className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition disabled:opacity-50">Onayla</button>
                        <button onClick={rejectPublic} disabled={publicLoading} className="flex-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition disabled:opacity-50">Reddet</button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
            {isPublic && (
              <div className="px-4 py-2 border-b border-border/30">
                <div className="text-[12px] text-emerald-400">Bu gönderi keşfette görünüyor</div>
              </div>
            )}

            {/* Yorumlar */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-600">Henüz yorum yok</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="group flex gap-2">
                    <Avatar src={c.author?.avatarUrl} name={c.author?.displayName || c.author?.username} size={24} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[12px] font-medium text-gray-300">{c.author?.displayName || c.author?.username}</span>
                        <span className="text-[10px] text-gray-600">{fmtTime(c.createdAt)}</span>
                        {c.author?.id === meId && (
                          <button onClick={() => deleteComment(c.id)} className="text-[10px] text-gray-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition">sil</button>
                        )}
                      </div>
                      <p className="text-[13px] text-gray-200">{c.deleted ? <em className="text-gray-600">Silindi</em> : c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Yorum input */}
            <div className="px-4 py-3 border-t border-border/50">
              <div className="flex gap-2">
                <input
                  ref={commentInputRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
                  placeholder="Yorum yaz..."
                  maxLength={1000}
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-3 border border-border-light text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-accent"
                />
                <button
                  onClick={submitComment}
                  disabled={!commentText.trim()}
                  className="px-3 py-2 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-40 transition"
                >
                  Gönder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
