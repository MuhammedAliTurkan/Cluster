export default function Input(props) {
  return (
    <input
      {...props}
      className={`bg-[#2B2B2B] border border-[#3A3A3A] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500 ${props.className||""}`}
    />
  );
}
