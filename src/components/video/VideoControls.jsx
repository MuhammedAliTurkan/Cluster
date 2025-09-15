export default function VideoControls() {
  const Control = ({ children }) => (
    <button className="px-4 py-2 rounded-lg bg-[#2B2B2B] hover:bg-[#3A3A3A] border border-[#3A3A3A]">{children}</button>
  );
  return (
    <div className="flex items-center justify-center gap-3">
      <Control>🎙️</Control>
      <Control>🎥</Control>
      <Control>🖥️</Control>
      <button className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 font-semibold">Çık</button>
    </div>
  );
}
