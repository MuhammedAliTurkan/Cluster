import { createContext, useContext, useMemo, useState } from "react";

const ModalContext = createContext(null);
export const useModals = () => useContext(ModalContext);

export function ModalProvider({ children }) {
  const [serverHubOpen, setServerHubOpen] = useState(false);
  const [serverHubTab, setServerHubTab] = useState("create");
  const [presetInvite, setPresetInvite] = useState("");

  const openServerHub = ({ tab = "create", invite = "" } = {}) => {
    setServerHubTab(tab);
    setPresetInvite(invite);
    setServerHubOpen(true);
  };
  const closeServerHub = () => setServerHubOpen(false);

  const value = useMemo(
    () => ({
      serverHubOpen,
      serverHubTab,
      presetInvite,
      openServerHub,
      closeServerHub,
      setServerHubTab,
    }),
    [serverHubOpen, serverHubTab, presetInvite]
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}
