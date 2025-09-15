import { createContext, useContext, useState, useMemo } from "react";

const ModalContext = createContext(null);
export const useModals = () => useContext(ModalContext);

export function ModalProvider({ children }) {
  const [createServerOpen, setCreateServerOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [channelPreset, setChannelPreset] = useState({ type: "text", categoryId: null });

  const value = useMemo(() => ({
    createServerOpen,
    openCreateServer: () => setCreateServerOpen(true),
    closeCreateServer: () => setCreateServerOpen(false),

    createChannelOpen,
    openCreateChannel: (preset = {}) => {
      setChannelPreset({ type: "text", categoryId: null, ...preset });
      setCreateChannelOpen(true);
    },
    closeCreateChannel: () => setCreateChannelOpen(false),
    channelPreset,
  }), [createServerOpen, createChannelOpen, channelPreset]);

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}
