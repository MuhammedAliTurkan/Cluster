export default function VideoControls() {
  const Control = ({ children }) => (
    <button className="px-4 py-2 rounded-lg bg-surface-3 hover:bg-surface-5 border border-border-light grid place-items-center">{children}</button>
  );
  return (
    <div className="flex items-center justify-center gap-3">
      <Control>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
          <rect x="9" y="1" width="6" height="11" rx="3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v4m-4 0h8" />
        </svg>
      </Control>
      <Control>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
          <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      </Control>
      <Control>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
          <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
        </svg>
      </Control>
      <button className="px-4 py-2 rounded-lg bg-accent-dark hover:bg-emerald-700 font-semibold">Çık</button>
    </div>
  );
}
