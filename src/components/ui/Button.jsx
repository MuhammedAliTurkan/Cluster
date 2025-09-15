export default function Button({ className="", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold ${className}`}
      {...props}
    />
  );
}
