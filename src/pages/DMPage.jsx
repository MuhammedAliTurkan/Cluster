// src/pages/DMPage.jsx
import { useParams } from "react-router-dom";
import ChatWindow from "../components/chat/ChatWindow";
import { useAuth } from "../context/AuthContext";

export default function DMPage() {
  const { channelId } = useParams();
  const { me } = useAuth(); // {id, username, displayName,...} dönüyor varsayımı
  return <ChatWindow channelId={channelId} currentUser={me} isDM />;
}
