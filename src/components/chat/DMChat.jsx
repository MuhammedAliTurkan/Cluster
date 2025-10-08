import { useEffect, useMemo, useState } from "react";
import MessageItem from "./MessageItem";

export default function DMChat({ friends = [], peerId }) {
  // 1) Arkadaş bilgisini peerId’den bul
  const friend = useMemo(() => friends.find(f => f.id === peerId), [friends, peerId]);

  // 2) Storage anahtarı sadece bu DM’ye özel
  const lsKey = peerId ? `dm:${peerId}` : null;

  // 3) Seed’ler (kullanıcıya özel – sadece ilk girişte)
  const seeds = {
    f1: [
      { id: crypto.randomUUID(), author: "Ada", content: "Merhaba! 👋", ts: Date.now() - 90000 },
      { id: crypto.randomUUID(), author: "Sen", content: "Selam Ada!", ts: Date.now() - 60000 },
    ],
    f2: [
      { id: crypto.randomUUID(), author: "Zed", content: "Deploy nasıl gitti?", ts: Date.now() - 120000 },
      { id: crypto.randomUUID(), author: "Sen", content: "Sorunsuz ✅", ts: Date.now() - 60000 },
    ],
    f3: [{ id: crypto.randomUUID(), author: "Kai", content: "Mock API hazır.", ts: Date.now() - 70000 }],
    f4: [{ id: crypto.randomUUID(), author: "Lia", content: "Standup 10:00'da.", ts: Date.now() - 80000 }],
  };

  // 4) Güvenli yükleyici (eski/bozuk veri ise sıfırlar)
  const safeLoad = () => {
    if (!peerId) return [];
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.peerId === peerId && Array.isArray(parsed.messages)) {
          return parsed.messages;
        }
        if (Array.isArray(parsed)) return parsed; // eski formatı da kabul et
      }
    } catch {}
    return seeds[peerId] || [
      { id: crypto.randomUUID(), author: friend?.name ?? "Kullanıcı", content: "Merhaba! 👋", ts: Date.now() - 60000 },
    ];
  };

  // 5) Hook sırası sabit
  const [messages, setMessages] = useState(safeLoad);

  // 6) peerId değişince bu DM’nin konuşmasını yeniden yükle
  useEffect(() => { setMessages(safeLoad()); /* eslint-disable-next-line */ }, [peerId]);

  // 7) Persist — yeni format: { peerId, messages }
  useEffect(() => {
    if (!lsKey) return;
    try { localStorage.setItem(lsKey, JSON.stringify({ peerId, messages })); } catch {}
  }, [messages, lsKey, peerId]);

  const [text, setText] = useState("");

  if (!friend) {
    return <div className="h-full grid place-items-center text-gray-400">Kullanıcı bulunamadı.</div>;
  }

  const send = (e) => {
    e?.preventDefault?.();
    if (!text.trim()) return;
    setMessages(prev => [...prev, { id: crypto.randomUUID(), author: "Sen", content: text.trim(), ts: Date.now() }]);
    setText("");
  };

  return (
    <div className="h-full flex flex-col min-w-0">
      {/* üst bar */}
      <div className="h-12 flex items-center gap-3 px-4 border-b border-[#333] bg-[#222]">
        <div className="w-8 h-8 rounded-full bg-[#2B2B2B] grid place-items-center">👤</div>
        <div className="font-semibold">{friend.name}</div>
        <div className="text-xs text-gray-400">Doğrudan mesaj</div>
      </div>

      {/* mesajlar */}
      <div className="flex-1 overflow-y-auto">
        {messages.map(m => <MessageItem key={m.id} msg={m} />)}
      </div>

      {/* giriş kutusu */}
      <form onSubmit={send} className="p-4 border-t border-[#333] bg-[#222]">
        <div className="flex items-center gap-2">
          <button type="button" className="px-2 py-2 rounded bg-[#2B2B2B] hover:bg-[#3A3A3A]">＋</button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`${friend.name}’a mesaj yaz`}
            className="flex-1 bg-[#2B2B2B] border border-[#3A3A3A] rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg font-semibold">Gönder</button>
        </div>
      </form>
    </div>
  );
}
