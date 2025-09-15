import VideoControls from "./VideoControls";
import ParticipantCard from "./ParticipantCard";

export default function VideoCall() {
  const participants = ["Ada","Es","Kai","Lia"];
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-4 grid gap-4"
           style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {participants.map(p => <ParticipantCard key={p} name={p} />)}
      </div>
      <div className="border-t border-[#333] bg-[#222] p-4">
        <VideoControls />
      </div>
    </div>
  );
}
