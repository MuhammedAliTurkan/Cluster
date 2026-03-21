import { useState } from "react";

export default function BotTokenDisplay({ token, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 space-y-3">
      <p className="text-yellow-400 text-sm font-semibold">
        Bot token'i simdi kopyalayin! Bir daha gosterilemez.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-gray-900 text-green-400 text-xs p-2 rounded font-mono break-all select-all">
          {token}
        </code>
        <button
          onClick={copy}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded"
        >
          {copied ? "Kopyalandi!" : "Kopyala"}
        </button>
      </div>
      <button
        onClick={onClose}
        className="text-xs text-gray-400 hover:text-white"
      >
        Tamam, kopyaladim
      </button>
    </div>
  );
}
