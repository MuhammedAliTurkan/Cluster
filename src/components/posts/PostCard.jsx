import Avatar from "../common/Avatar";

export default function PostCard({ post, onClick }) {
  const cover = post.images?.[0]?.imageUrl;
  const multiImage = (post.images?.length || 0) > 1;

  return (
    <button
      onClick={() => onClick?.(post)}
      className="group relative rounded-xl overflow-hidden bg-surface-3 border border-border-light/30 hover:border-accent/30 transition aspect-square w-full"
    >
      {cover ? (
        <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-gray-600">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      )}

      {/* Multi-image göstergesi */}
      {multiImage && (
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-white">
            <rect x="1" y="3" width="10" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <rect x="5" y="1" width="10" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex items-center gap-4 text-white font-semibold text-sm">
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
            {post.likeCount}
          </span>
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zm-4 0H9v2h2V9z" clipRule="evenodd" />
            </svg>
            {post.commentCount}
          </span>
        </div>
      </div>

      {/* Alt bar — creator */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
        <div className="flex items-center gap-1.5">
          <Avatar src={post.creator?.avatarUrl} name={post.creator?.displayName || post.creator?.username} size={18} />
          <span className="text-[11px] text-white/80 truncate">{post.creator?.displayName || post.creator?.username}</span>
        </div>
      </div>
    </button>
  );
}
