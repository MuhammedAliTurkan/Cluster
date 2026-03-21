export default function VoiceControls() {
  const Btn = ({ children }) => (
    <button className="px-4 py-2 rounded-lg bg-surface-3 hover:bg-surface-5 border border-border-light flex items-center gap-2">{children}</button>
  );
  return (
    <div className="flex items-center justify-center gap-3">
      <Btn>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
          <rect x="9" y="1" width="6" height="11" rx="3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v4m-4 0h8" />
        </svg>
        Sessize Al
      </Btn>
      <Btn>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
          <path d="M3 14h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3v-7z" /><path d="M21 14h-2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-7z" /><path d="M3 14v-2a9 9 0 1 1 18 0v2" />
        </svg>
        Kulaklık
      </Btn>
      <button className="px-4 py-2 rounded-lg bg-accent-dark hover:bg-emerald-700 font-semibold">Bağlantıyı Kes</button>
    </div>
  );
}
