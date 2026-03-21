export default function Input(props) {
  return (
    <input
      {...props}
      className={`bg-surface-3 border border-border-light rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-accent ${props.className||""}`}
    />
  );
}
