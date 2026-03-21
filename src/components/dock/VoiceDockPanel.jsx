import { forwardRef, useCallback } from "react";
import { useMedia } from "../../context/MediaContext";

const VoiceDockPanel = forwardRef(function VoiceDockPanel({ onNodeReady }, ref) {
  const media = useMedia();

  const setNode = useCallback((node) => {
    if (onNodeReady) onNodeReady(node);
  }, [onNodeReady]);

  // Container div HER ZAMAN render edilir — PersistentVoice portal'ı bu div'e bağlı
  // inCall değilse üstüne mesaj göster
  return (
    <div ref={setNode} className="h-full w-full overflow-hidden relative">
      {!media.inCall && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm bg-surface-2">
          Sesli sohbette değilsiniz
        </div>
      )}
    </div>
  );
});

export default VoiceDockPanel;
