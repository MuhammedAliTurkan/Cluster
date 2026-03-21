export default function Button({ className="", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center px-4 py-2 rounded-lg bg-accent hover:bg-accent-dark text-white font-semibold ${className}`}
      {...props}
    />
  );
}
