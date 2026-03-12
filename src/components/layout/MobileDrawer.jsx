// Basit, animasyonlu mobil çekmece
export default function MobileDrawer({ open, onClose, children, side = "left", width = 280 }) {
  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 transition-opacity duration-200 z-40 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        } md:hidden`}
      />
      {/* panel */}
      <div
        className={`fixed top-0 bottom-0 ${side === "left" ? "left-0" : "right-0"} z-50 md:hidden`}
        style={{ width }}
      >
        <div
          className={`h-full w-full transform transition-transform duration-200 ${
            open ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full"
          }`}
        >
          {children}
        </div>
      </div>
    </>
  );
}
