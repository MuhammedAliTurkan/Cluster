export default function ParticipantCard({ name }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border-light bg-surface-1">
      <div className="aspect-video bg-surface-3 grid place-items-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-10 h-10 text-gray-500">
          <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      </div>
      <div className="px-3 py-2 text-sm text-gray-300">{name}</div>
    </div>
  );
}
