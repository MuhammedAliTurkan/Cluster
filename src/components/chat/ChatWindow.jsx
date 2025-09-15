import { useChat } from "../../context/ChatContext";
import MessageItem from "./MessageItem";
import ChatInput from "./ChatInput";

export default function ChatWindow() {
  const { messages } = useChat();

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {messages.map(m => <MessageItem key={m.id} msg={m} />)}
      </div>
      <ChatInput />
    </div>
  );
}
