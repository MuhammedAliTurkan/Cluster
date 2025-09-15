import { useState } from "react";
import { useChat } from "../../context/ChatContext";

export default function ChatInput() {
  const [text, setText] = useState("");
  const { setMessages } = useChat();

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setMessages(prev => [...prev, { id: crypto.randomUUID(), author: "Sen", content: text.trim(), ts: Date.now() }]);
    setText("");
  };

  return (
    <form onSubmit={send} className="p-4 border-t border-[#333] bg-[#222]">
      <div className="flex items-center gap-2">
        <button type="button" className="px-2 py-2 rounded bg-[#2B2B2B] hover:bg-[#3A3A3A]">＋</button>
        <input
          value={text}
          onChange={(e)=>setText(e.target.value)}
          placeholder="#genel’e mesaj yaz"
          className="flex-1 bg-[#2B2B2B] border border-[#3A3A3A] rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg font-semibold">Gönder</button>
      </div>
    </form>
  );
}
