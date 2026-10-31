import { getInitials } from '../../utils/format.js';

const PALETTE = ['bg-caramel/20', 'bg-sage/25', 'bg-honey/30', 'bg-beige', 'bg-brown/15'];

function hash(value) {
  return [...value].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
}

export default function Avatar({ name = '', size = 'md', className = '' }) {
  const sizing = { sm: 'h-9 w-9 text-[13px]', md: 'h-11 w-11 text-sm', lg: 'h-16 w-16 text-xl' }[size];
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-bold text-espresso ring-1 ring-beige ${PALETTE[hash(name) % PALETTE.length]} ${sizing} ${className}`}
    >
      {getInitials(name)}
    </span>
  );
}
