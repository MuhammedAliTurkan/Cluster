import { publishApp } from "../../services/ws";

/* ── Mesajın "taze" olup olmadığını belirle ── */
function isRecent(createdAt, durationStr) {
  if (!createdAt) return false;
  const diff = Date.now() - new Date(createdAt).getTime();
  // Şarkı süresi varsa süre + 1 dakika marj, yoksa 10 dakika
  if (durationStr) {
    const parts = durationStr.split(":");
    const secs = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
    return diff < (secs + 60) * 1000;
  }
  return diff < 10 * 60 * 1000;
}

/* ── SVG İkonlar ── */
const Icons = {
  music: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  ),
  skip: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M6 4l12 8-12 8V4zm12 0v16h2V4h-2z" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  ),
  resume: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  stop: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ),
  queue: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M4 6h16M4 12h12M4 18h8" strokeLinecap="round" />
    </svg>
  ),
  add: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8m-4-4h8" strokeLinecap="round" />
    </svg>
  ),
  remove: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4m0-4h.01" strokeLinecap="round" />
    </svg>
  ),
  stopped: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ),
};

/* ── Animasyonlu müzik barları ── */
function MusicBars({ color = "bg-indigo-400" }) {
  return (
    <div className="flex items-end gap-[2px] h-5">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-[3px] ${color} rounded-full`}
          style={{
            animation: `music-bar-bounce 0.8s ease-in-out ${i * 0.15}s infinite`,
            height: "100%",
          }}
        />
      ))}
      <style>{`
        @keyframes music-bar-bounce {
          0%, 100% { transform: scaleY(0.25); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

/* ── Parse yardımcıları ── */
function parseTitle(text) {
  const match = text.match(/\*\*(.+?)\*\*/);
  return match ? match[1] : null;
}

function parseDuration(text) {
  const match = text.match(/\((\d+:\d{2})\)/);
  return match ? match[1] : null;
}

function parseQueue(text) {
  const lines = text.split("\n");
  const current = parseTitle(lines[0]) || null;
  const items = [];
  let inQueue = false;
  for (const line of lines) {
    if (line.includes("Kuyruk:")) { inQueue = true; continue; }
    if (inQueue) {
      const m = line.match(/^(\d+)\.\s+(.+)$/);
      if (m) items.push({ index: parseInt(m[1]), title: m[2].trim() });
    }
  }
  return { current, items, empty: text.includes("Kuyruk boş") };
}

/* ── Mesaj tipi algılama ── */
function detectType(content) {
  if (!content) return null;
  if (content.startsWith("🔍")) return "searching";
  if (content.startsWith("🎵") && content.includes("Kuyruğa eklendi")) return "queued";
  if (content.startsWith("🎶") && /cal[ıi]n[ıi]yor|çalınıyor/i.test(content) && !content.includes("📋")) return "playing";
  if (content.startsWith("⏭️")) return "skipped";
  if (content.startsWith("⏸️")) return "paused";
  if (content.startsWith("▶️") && content.includes("Devam ediliyor")) return "resumed";
  if (content.startsWith("⏹️")) return "stopped";
  if (content.startsWith("🗑️")) return "removed";
  if (content.includes("📋 Kuyruk") || (content.includes("Şimdi çalınıyor") && content.includes("\n"))) return "queue";
  if (content === "Şu an bir şey çalınmıyor." || content === "Kuyruk boş, müzik durduruluyor.") return "idle";
  if (/bulunamadı|hata oluştu|Stream URL|oluşturulamadı|Geçersiz sıra/i.test(content)) return "error";
  return null;
}

/* ── Kontrol butonu ── */
function ControlBtn({ icon, label, onClick, hoverCls = "hover:bg-white/10 hover:text-white" }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/5 text-gray-400 transition text-[12px] ${hoverCls}`}
    >
      {icon} {label}
    </button>
  );
}

/* ═══════════════════════════════════════════
   ANA BİLEŞEN
   ═══════════════════════════════════════════ */
export default function MusicPlayerWidget({ content, channelId, createdAt }) {
  const type = detectType(content);
  const duration = parseDuration(content);
  const fresh = isRecent(createdAt, duration);
  const send = (cmd) => {
    publishApp(`/app/channels/${channelId}/send`, {
      content: cmd,
      type: "TEXT",
      parentMessageId: null,
    });
  };

  /* ── Şimdi Çalınıyor / Çalındı ── */
  if (type === "playing") {
    const title = parseTitle(content);
    return (
      <div className={`rounded-xl border overflow-hidden min-w-[280px] max-w-[380px] ${
        fresh ? "border-indigo-500/25" : "border-white/5"
      }`}>
        {/* Üst bölüm */}
        <div className={`p-3 ${
          fresh
            ? "bg-gradient-to-br from-indigo-600/25 via-purple-600/15 to-pink-600/10"
            : "bg-white/[0.03]"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
              fresh ? "bg-indigo-500/20 border border-indigo-500/20" : "bg-white/5"
            }`}>
              {fresh ? (
                <MusicBars color="bg-indigo-400" />
              ) : (
                <div className="text-gray-500">{Icons.music}</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] uppercase tracking-widest font-bold mb-0.5 flex items-center gap-1.5 ${
                fresh ? "text-indigo-400" : "text-gray-500"
              }`}>
                {fresh && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {fresh ? "Şimdi Çalınıyor" : "Çalındı"}
              </p>
              <p className={`text-[14px] font-semibold truncate ${fresh ? "text-white" : "text-gray-400"}`} title={title}>{title}</p>
              {duration && (
                <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-gray-600">
                    <path d="M8 0a8 8 0 110 16A8 8 0 018 0zm.5 3.5a.5.5 0 00-1 0v5a.5.5 0 00.25.43l3 1.75a.5.5 0 10.5-.86L8.5 8.14V3.5z" />
                  </svg>
                  {duration}
                </p>
              )}
            </div>
          </div>
        </div>
        {/* Kontroller — sadece taze mesajlarda */}
        {fresh && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-black/20">
            <ControlBtn icon={Icons.pause} label="Duraklat" onClick={() => send("!pause")} hoverCls="hover:bg-amber-500/15 hover:text-amber-400" />
            <ControlBtn icon={Icons.skip} label="Atla" onClick={() => send("!skip")} />
            <ControlBtn icon={Icons.stop} label="Durdur" onClick={() => send("!stop")} hoverCls="hover:bg-rose-500/15 hover:text-rose-400" />
            <ControlBtn icon={Icons.queue} label="Kuyruk" onClick={() => send("!queue")} />
          </div>
        )}
      </div>
    );
  }

  /* ── Aranıyor ── */
  if (type === "searching") {
    const query = content.replace(/^🔍\s*Aranıyor:\s*/, "");
    return (
      <div className={`rounded-xl border p-3 min-w-[240px] max-w-[360px] flex items-center gap-3 ${
        fresh ? "border-blue-500/20 bg-blue-500/5" : "border-white/5 bg-white/[0.03]"
      }`}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          fresh ? "bg-blue-500/15 text-blue-400 animate-pulse" : "bg-white/5 text-gray-500"
        }`}>
          {Icons.search}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${fresh ? "text-blue-400" : "text-gray-500"}`}>
            {fresh ? "Aranıyor" : "Arandı"}
          </p>
          <p className={`text-[13px] truncate ${fresh ? "text-gray-300" : "text-gray-500"}`}>{query}</p>
        </div>
        {fresh && (
          <div className="shrink-0">
            <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }

  /* ── Kuyruğa Eklendi ── */
  if (type === "queued") {
    const title = parseTitle(content);
    return (
      <div className={`rounded-xl border p-3 min-w-[240px] max-w-[360px] flex items-center gap-3 ${
        fresh ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/5 bg-white/[0.03]"
      }`}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          fresh ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-gray-500"
        }`}>
          {Icons.add}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${fresh ? "text-emerald-400" : "text-gray-500"}`}>Kuyruğa Eklendi</p>
          <p className={`text-[13px] font-medium truncate ${fresh ? "text-white" : "text-gray-400"}`} title={title}>{title}</p>
        </div>
      </div>
    );
  }

  /* ── Duraklatıldı ── */
  if (type === "paused") {
    const title = parseTitle(content);
    const time = content.match(/\((\d+:\d{2})\)/)?.[1];
    return (
      <div className={`rounded-xl border overflow-hidden min-w-[280px] max-w-[380px] ${
        fresh ? "border-amber-500/20" : "border-white/5"
      }`}>
        <div className={`p-3 ${
          fresh ? "bg-gradient-to-br from-amber-600/20 via-amber-600/10 to-orange-600/5" : "bg-white/[0.03]"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
              fresh ? "bg-amber-500/20 border border-amber-500/20" : "bg-white/5"
            }`}>
              <span className={fresh ? "text-amber-400" : "text-gray-500"}>{Icons.pause}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] uppercase tracking-widest font-bold mb-0.5 ${fresh ? "text-amber-400" : "text-gray-500"}`}>Duraklatıldı</p>
              <p className={`text-[14px] font-semibold truncate ${fresh ? "text-white" : "text-gray-400"}`} title={title}>{title}</p>
              {time && <p className="text-[11px] text-gray-500 mt-0.5">{time} noktasında</p>}
            </div>
          </div>
        </div>
        {fresh && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-black/20">
            <ControlBtn icon={Icons.resume} label="Devam Et" onClick={() => send("!resume")} hoverCls="hover:bg-emerald-500/15 hover:text-emerald-400" />
            <ControlBtn icon={Icons.stop} label="Durdur" onClick={() => send("!stop")} hoverCls="hover:bg-rose-500/15 hover:text-rose-400" />
          </div>
        )}
      </div>
    );
  }

  /* ── Devam Ediliyor ── */
  if (type === "resumed") {
    const title = parseTitle(content);
    const time = content.match(/\((\d+:\d{2})\)/)?.[1];
    return (
      <div className={`rounded-xl border overflow-hidden min-w-[280px] max-w-[380px] ${
        fresh ? "border-emerald-500/25" : "border-white/5"
      }`}>
        <div className={`p-3 ${
          fresh ? "bg-gradient-to-br from-emerald-600/20 via-emerald-600/10 to-teal-600/5" : "bg-white/[0.03]"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
              fresh ? "bg-emerald-500/20 border border-emerald-500/20 text-emerald-400" : "bg-white/5"
            }`}>
              {fresh ? (
                <MusicBars color="bg-emerald-400" />
              ) : (
                <div className="text-gray-500">{Icons.music}</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] uppercase tracking-widest font-bold mb-0.5 flex items-center gap-1.5 ${
                fresh ? "text-emerald-400" : "text-gray-500"
              }`}>
                {fresh && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {fresh ? "Devam Ediliyor" : "Devam Edildi"}
              </p>
              <p className={`text-[14px] font-semibold truncate ${fresh ? "text-white" : "text-gray-400"}`} title={title}>{title}</p>
              {time && <p className="text-[11px] text-gray-500 mt-0.5">{time} noktasından</p>}
            </div>
          </div>
        </div>
        {fresh && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-black/20">
            <ControlBtn icon={Icons.pause} label="Duraklat" onClick={() => send("!pause")} hoverCls="hover:bg-amber-500/15 hover:text-amber-400" />
            <ControlBtn icon={Icons.skip} label="Atla" onClick={() => send("!skip")} />
            <ControlBtn icon={Icons.stop} label="Durdur" onClick={() => send("!stop")} hoverCls="hover:bg-rose-500/15 hover:text-rose-400" />
          </div>
        )}
      </div>
    );
  }

  /* ── Şarkı Atlandı ── */
  if (type === "skipped") {
    return (
      <div className={`rounded-xl border p-3 min-w-[220px] max-w-[320px] flex items-center gap-3 ${
        fresh ? "border-amber-500/20 bg-amber-500/5" : "border-white/5 bg-white/[0.03]"
      }`}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          fresh ? "bg-amber-500/15 text-amber-400" : "bg-white/5 text-gray-500"
        }`}>
          {Icons.skip}
        </div>
        <div>
          <p className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${fresh ? "text-amber-400" : "text-gray-500"}`}>Atlandı</p>
          <p className={`text-[13px] ${fresh ? "text-gray-300" : "text-gray-500"}`}>Şarkı atlandı, sıradaki çalınıyor...</p>
        </div>
      </div>
    );
  }

  /* ── Müzik Durduruldu ── */
  if (type === "stopped") {
    return (
      <div className={`rounded-xl border p-3 min-w-[220px] max-w-[320px] flex items-center gap-3 ${
        fresh ? "border-rose-500/20 bg-rose-500/5" : "border-white/5 bg-white/[0.03]"
      }`}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          fresh ? "bg-rose-500/15 text-rose-400" : "bg-white/5 text-gray-500"
        }`}>
          {Icons.stopped}
        </div>
        <div>
          <p className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${fresh ? "text-rose-400" : "text-gray-500"}`}>Durduruldu</p>
          <p className={`text-[13px] ${fresh ? "text-gray-300" : "text-gray-500"}`}>Müzik durduruldu, kuyruk temizlendi.</p>
        </div>
      </div>
    );
  }

  /* ── Kuyruktan Çıkarıldı ── */
  if (type === "removed") {
    const title = parseTitle(content);
    return (
      <div className={`rounded-xl border p-3 min-w-[220px] max-w-[340px] flex items-center gap-3 ${
        fresh ? "border-gray-500/20 bg-gray-500/5" : "border-white/5 bg-white/[0.03]"
      }`}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          fresh ? "bg-gray-500/15 text-gray-400" : "bg-white/5 text-gray-500"
        }`}>
          {Icons.remove}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${fresh ? "text-gray-400" : "text-gray-500"}`}>Kuyruktan Çıkarıldı</p>
          <p className={`text-[13px] truncate ${fresh ? "text-gray-300" : "text-gray-500"}`} title={title}>{title}</p>
        </div>
      </div>
    );
  }

  /* ── Kuyruk Listesi ── */
  if (type === "queue") {
    const { current, items, empty } = parseQueue(content);
    return (
      <div className={`rounded-xl border overflow-hidden min-w-[260px] max-w-[400px] ${
        fresh ? "border-indigo-500/20" : "border-white/5"
      }`}>
        {/* Şu an çalan */}
        {current && (
          <div className={`px-3 py-2.5 flex items-center gap-2.5 border-b ${
            fresh ? "bg-indigo-500/10 border-indigo-500/10" : "bg-white/[0.03] border-white/5"
          }`}>
            <div className="shrink-0">
              {fresh ? <MusicBars color="bg-indigo-400" /> : <div className="text-gray-500">{Icons.music}</div>}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] uppercase tracking-wider font-bold ${fresh ? "text-indigo-400" : "text-gray-500"}`}>
                {fresh ? "Şimdi Çalınıyor" : "Çalınıyordu"}
              </p>
              <p className={`text-[13px] font-medium truncate ${fresh ? "text-white" : "text-gray-400"}`}>{current}</p>
            </div>
          </div>
        )}
        {/* Kuyruk */}
        <div className="bg-black/10 px-3 py-2">
          {items.length > 0 ? (
            <>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5 flex items-center gap-1.5">
                {Icons.queue} Sıradaki — {items.length} şarkı
              </p>
              <div className="space-y-1">
                {items.map((item) => (
                  <div key={item.index} className="flex items-center gap-2 group">
                    <span className="text-[11px] text-gray-600 w-5 text-right shrink-0 font-mono">{item.index}</span>
                    <p className={`text-[13px] truncate flex-1 ${fresh ? "text-gray-300" : "text-gray-500"}`}>{item.title}</p>
                    {fresh && (
                      <button
                        onClick={() => send(`!remove ${item.index}`)}
                        title="Kuyruktan çıkar"
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-rose-400 transition shrink-0"
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                          <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[12px] text-gray-500 py-1">
              {empty ? "Kuyruk boş." : current ? "Sırada başka şarkı yok." : "Şu an bir şey çalınmıyor."}
            </p>
          )}
        </div>
        {/* Kontroller — sadece taze */}
        {fresh && current && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-black/15 border-t border-white/5">
            <ControlBtn icon={Icons.skip} label="Atla" onClick={() => send("!skip")} />
            <ControlBtn icon={Icons.stop} label="Durdur" onClick={() => send("!stop")} hoverCls="hover:bg-rose-500/15 hover:text-rose-400" />
          </div>
        )}
      </div>
    );
  }

  /* ── Boş / Çalınmıyor ── */
  if (type === "idle") {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 min-w-[220px] max-w-[320px] flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-gray-500">
          {Icons.info}
        </div>
        <p className="text-[13px] text-gray-500">{content}</p>
      </div>
    );
  }

  /* ── Hata ── */
  if (type === "error") {
    return (
      <div className={`rounded-xl border p-3 min-w-[220px] max-w-[360px] flex items-center gap-3 ${
        fresh ? "border-rose-500/20 bg-rose-500/5" : "border-white/5 bg-white/[0.03]"
      }`}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          fresh ? "bg-rose-500/15 text-rose-400" : "bg-white/5 text-gray-500"
        }`}>
          {Icons.error}
        </div>
        <p className={`text-[13px] ${fresh ? "text-rose-300" : "text-gray-500"}`}>{content}</p>
      </div>
    );
  }

  /* ── Fallback: bilinmeyen format ── */
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 min-w-[220px] max-w-[360px] flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-gray-500">
        {Icons.music}
      </div>
      <p className="text-[13px] text-gray-400 whitespace-pre-wrap">{content}</p>
    </div>
  );
}

/* ── Dışarıdan erişim: bu mesaj müzik botu mesajı mı? ── */
export function isMusicBotMessage(content) {
  return detectType(content) !== null;
}
