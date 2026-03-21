import Avatar from "../common/Avatar";
import { usePresence, STATUS_OPTIONS } from "../../context/PresenceContext";

export default function UserProfilePopup({ user, onClose }) {
  const { myStatus } = usePresence();
  if (!user) return null;

  const display = user.displayName || user.username || "Kullanıcı";
  const statusOpt = STATUS_OPTIONS.find((o) => o.value === myStatus);
  const bannerBg = user.bannerUrl
    ? { backgroundImage: `url(${user.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundColor: user.bannerColor || "#059669" };

  return (
    <div className="w-72 rounded-xl bg-surface-1 border border-white/10 shadow-2xl overflow-hidden">
      {/* Banner */}
      <div className="h-16" style={bannerBg} />

      {/* Avatar + Info */}
      <div className="px-3 pb-3 relative">
        <div className="absolute -top-7 left-3">
          <Avatar src={user.avatarUrl} name={display} size={54} status={myStatus} className="ring-4 ring-surface-1" />
        </div>

        <div className="pt-8">
          <div className="text-white text-[16px] truncate">{display}</div>
          <div className="text-gray-400 text-xs truncate">@{user.username}</div>

          {/* Status */}
          <div className="mt-2 flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${statusOpt?.color || "bg-gray-500"}`} />
            <span className="text-xs text-gray-300">{statusOpt?.label || "Çevrimdışı"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
