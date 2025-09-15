export default function ParticipantCard({ name }) {
  return (
    <div className="rounded-xl overflow-hidden border border-[#333] bg-[#111]">
      <div className="aspect-video bg-[#2B2B2B] grid place-items-center text-3xl">🎥</div>
      <div className="px-3 py-2 text-sm text-gray-300">{name}</div>
    </div>
  );
}
