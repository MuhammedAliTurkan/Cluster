import VoiceControls from "./VoiceControls";

export default function VoiceChannel() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <div className="bg-[#222] border border-[#333] rounded-2xl p-8 text-center w-[min(720px,92%)]">
        <h2 className="text-xl font-semibold mb-2">🔊 Ses Kanalı</h2>
        <p className="text-gray-400 mb-6">Bağlantı bekleniyor… (mock)</p>

        <div className="grid grid-cols-3 gap-4">
          {["Ada","Es","Kai"].map(n => (
            <div key={n} className="aspect-square rounded-xl bg-[#2B2B2B] grid place-items-center">
              <div className="text-center">
                <div className="text-3xl mb-2">🎤</div>
                <div className="text-sm">{n}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6"><VoiceControls /></div>
      </div>
    </div>
  );
}
