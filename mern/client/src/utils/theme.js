// Full class strings (Tailwind CDN can't see dynamically built class names).
export const THEMES = {
  shoes: {
    name: 'Shoes',
    btn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    btnSoft: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700',
    grad: 'bg-gradient-to-r from-indigo-600 to-sky-500',
    text: 'text-indigo-600',
    border: 'border-indigo-500',
    ring: 'focus:border-indigo-500',
    tabOn: 'border-indigo-600 text-indigo-600',
    spin: 'border-indigo-500',
    chip: 'bg-indigo-50 text-indigo-700',
    hex: '#4f46e5',
    routes: { staff: '/dashboard/salesmen', suppliers: '/dashboard/suppliers', finance: '/dashboard/finance', products: '/dashboard/products', inventory: '/dashboard/inventory' },
  },
  clothes: {
    name: 'Clothes',
    btn: 'bg-rose-600 hover:bg-rose-700 text-white',
    btnSoft: 'bg-rose-50 hover:bg-rose-100 text-rose-700',
    grad: 'bg-gradient-to-r from-rose-500 to-orange-500',
    text: 'text-rose-600',
    border: 'border-rose-500',
    ring: 'focus:border-rose-500',
    tabOn: 'border-rose-600 text-rose-600',
    spin: 'border-rose-500',
    chip: 'bg-rose-50 text-rose-700',
    hex: '#e11d48',
    routes: { staff: '/clothes/staff', suppliers: '/clothes/suppliers', finance: '/clothes/finance', products: '/clothes/products', inventory: '/clothes/inventory' },
  },
};
export const themeOf = (vertical) => THEMES[vertical] || THEMES.shoes;
