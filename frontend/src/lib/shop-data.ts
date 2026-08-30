// Asset fallbacks: prefer public images added by the admin/user, otherwise fall back to a hosted placeholder
const printing = "/images/printing-image.png";
const hero = "/images/hero-image.png";
const placeholder = "https://via.placeholder.com/800x600?text=Product";

const apparel = printing;
const drinkware = printing;
const cases = printing;
const stationery = printing;
const corporate = printing;

export const categoryImages = { apparel, drinkware, cases, stationery, corporate };

export type Category = {
  slug: string;
  name: string;
  blurb: string;
  image: string;
  items: number;
};

export const categories: Category[] = [
  {
    slug: "apparel",
    name: "Apparel",
    blurb: "Tees, hoodies & polos",
    image: apparel,
    items: 48,
  },
  { slug: "mugs", name: "Mugs", blurb: "Ceramic & enamel mugs", image: drinkware, items: 24 },
  {
    slug: "t-shirts",
    name: "T-Shirts",
    blurb: "Various sizes & colours",
    image: apparel,
    items: 64,
  },
  {
    slug: "totes",
    name: "Tote Bags",
    blurb: "Canvas and reusable totes",
    image: corporate,
    items: 18,
  },
  { slug: "drinkware", name: "Drinkware", blurb: "Mugs & bottles", image: drinkware, items: 26 },
  {
    slug: "phone-cases",
    name: "Phone Cases",
    blurb: "Matte & glossy shells",
    image: cases,
    items: 34,
  },
  {
    slug: "hoodies",
    name: "Hoodies",
    blurb: "Pullover and zip-up hoodies",
    image: apparel,
    items: 22,
  },
  {
    slug: "wall-art",
    name: "Wall Art",
    blurb: "Prints, canvases and posters",
    image: stationery,
    items: 30,
  },
  {
    slug: "keychains",
    name: "Keychains",
    blurb: "Metal and acrylic keychains",
    image: corporate,
    items: 12,
  },
  { slug: "caps", name: "Caps", blurb: "Caps and hats", image: apparel, items: 16 },
  {
    slug: "stationery",
    name: "Stationery",
    blurb: "Notebooks & cards",
    image: stationery,
    items: 19,
  },
  { slug: "kids", name: "Kids", blurb: "Kids tees, totes & stickers", image: apparel, items: 20 },
  {
    slug: "corporate",
    name: "Corporate Merch",
    blurb: "Branded team kits",
    image: corporate,
    items: 22,
  },
];

export type Product = {
  id: string;
  name: string;
  category: string;
  material: string;
  colors: string[];
  price: number;
  rating: number;
  reviews: number;
  options: string;
  image: string;
  badge?: string;
  imageByColor?: Record<string, string>;
  productType?: "pre-designed" | "blank";
  sizes?: string[];
  theme?: string;
};

export const products: Product[] = [
  {
    id: "af-tee-classic",
    name: "Classic Cotton Print Tee",
    category: "Apparel",
    material: "100% Cotton",
    colors: ["Cream", "Maroon", "Charcoal"],
    price: 24,
    rating: 4.9,
    reviews: 214,
    options: "6 print areas",
    image: apparel,
    imageByColor: { Cream: apparel, Maroon: apparel, Charcoal: apparel },
    badge: "Best Seller",
  },
  {
    id: "af-mug-ceramic",
    name: "Ceramic Wrap Mug 11oz",
    category: "Drinkware",
    material: "Ceramic",
    colors: ["Cream", "Maroon"],
    price: 16,
    rating: 4.8,
    reviews: 168,
    options: "Full wrap print",
    image: drinkware,
    imageByColor: { Cream: drinkware, Maroon: drinkware },
    badge: "Top Rated",
  },
  {
    id: "af-mug-enamel",
    name: "Enamel Camp Mug",
    category: "Drinkware",
    material: "Ceramic",
    colors: ["Cream"],
    price: 20,
    rating: 4.4,
    reviews: 41,
    options: "Wrap print",
    image: drinkware,
    imageByColor: { Cream: drinkware },
    theme: "halloween",
  },
  {
    id: "af-case-matte",
    name: "Matte Snap Phone Case",
    category: "Phone Cases",
    material: "Matte Plastic",
    colors: ["Maroon", "Nude", "Charcoal"],
    price: 21,
    rating: 4.7,
    reviews: 132,
    options: "12 device models",
    image: cases,
    imageByColor: { Maroon: cases, Nude: cases, Charcoal: cases },
  },
  {
    id: "af-note-foil",
    name: "Foil Stamped Notebook",
    category: "Stationery",
    material: "Recycled Paper",
    colors: ["Maroon", "Cream"],
    price: 18,
    rating: 4.9,
    reviews: 96,
    options: "Gold or blind foil",
    image: stationery,
    imageByColor: { Maroon: stationery, Cream: stationery },
    badge: "New",
  },
  {
    id: "af-corp-kit",
    name: "Corporate Welcome Kit",
    category: "Corporate Merch",
    material: "Mixed",
    colors: ["Maroon", "Cream"],
    price: 68,
    rating: 5,
    reviews: 74,
    options: "Bulk pricing tiers",
    image: corporate,
    imageByColor: { Maroon: corporate, Cream: corporate },
    badge: "Bulk 30% Off",
  },
  {
    id: "af-tee-heavy",
    name: "Heavyweight Oversized Tee",
    category: "Apparel",
    material: "100% Cotton",
    colors: ["Cream", "Charcoal"],
    price: 32,
    rating: 4.8,
    reviews: 141,
    options: "Front & back print",
    image: apparel,
    imageByColor: { Cream: apparel, Charcoal: apparel },
  },
  {
    id: "af-bottle-steel",
    name: "Insulated Steel Bottle",
    category: "Drinkware",
    material: "Ceramic",
    colors: ["Maroon"],
    price: 29,
    rating: 4.6,
    reviews: 58,
    options: "Laser or UV print",
    image: corporate,
    imageByColor: { Maroon: corporate },
  },
  {
    id: "af-case-clear",
    name: "Clear Edge Phone Case",
    category: "Phone Cases",
    material: "Matte Plastic",
    colors: ["Nude"],
    price: 19,
    rating: 4.5,
    reviews: 87,
    options: "Edge-to-edge print",
    image: cases,
    imageByColor: { Nude: cases },
  },
  {
    id: "af-cards-set",
    name: "Letterpress Card Set",
    category: "Stationery",
    material: "Recycled Paper",
    colors: ["Cream", "Maroon"],
    price: 22,
    rating: 4.9,
    reviews: 63,
    options: "Pack of 25",
    image: stationery,
    imageByColor: { Cream: stationery, Maroon: stationery },
  },
  {
    id: "af-tote-canvas",
    name: "Canvas Brand Tote",
    category: "Corporate Merch",
    material: "100% Cotton",
    colors: ["Cream", "Maroon"],
    price: 26,
    rating: 4.7,
    reviews: 119,
    options: "1–4 colour print",
    image: corporate,
    imageByColor: { Cream: corporate, Maroon: corporate },
  },
  {
    id: "af-mug-enamel-camp",
    name: "Enamel Camp Mug",
    category: "Drinkware",
    material: "Ceramic",
    colors: ["Cream"],
    price: 20,
    rating: 4.4,
    reviews: 41,
    options: "Wrap print",
    image: drinkware,
    imageByColor: { Cream: drinkware },
  },
  {
    id: "af-polo-corp",
    name: "Embroidered Team Polo",
    category: "Apparel",
    material: "100% Cotton",
    colors: ["Maroon", "Cream"],
    price: 38,
    rating: 4.8,
    reviews: 77,
    options: "Left chest logo",
    image: apparel,
    imageByColor: { Maroon: apparel, Cream: apparel },
  },
  {
    id: "af-mug-travel",
    name: "Travel Tumbler 16oz",
    category: "Mugs",
    material: "Stainless Steel",
    colors: ["Maroon", "Charcoal"],
    price: 28,
    rating: 4.6,
    reviews: 45,
    options: "Double-wall insulated",
    image: drinkware,
    imageByColor: { Maroon: drinkware, Charcoal: drinkware },
  },
  {
    id: "af-tee-youth",
    name: "Youth Cotton Tee",
    category: "Kids",
    material: "100% Cotton",
    colors: ["Cream", "Maroon", "Charcoal"],
    price: 18,
    rating: 4.7,
    reviews: 32,
    options: "Kids sizes XS–L",
    image: apparel,
    imageByColor: { Cream: apparel, Maroon: apparel, Charcoal: apparel },
    theme: "kids",
  },
  {
    id: "af-hoodie-zip",
    name: "Zip Hoodie",
    category: "Hoodies",
    material: "Cotton Blend",
    colors: ["Charcoal", "Cream"],
    price: 48,
    rating: 4.8,
    reviews: 58,
    options: "Full zip, kangaroo pockets",
    image: apparel,
    imageByColor: { Charcoal: apparel, Cream: apparel },
  },
  {
    id: "af-tote-canvas-large",
    name: "Large Canvas Tote",
    category: "Tote Bags",
    material: "100% Cotton",
    colors: ["Cream"],
    price: 22,
    rating: 4.5,
    reviews: 19,
    options: "Long handles",
    image: corporate,
    imageByColor: { Cream: corporate },
  },
  {
    id: "af-case-model-x",
    name: "Phone Case — Model X",
    category: "Phone Cases",
    material: "Matte Plastic",
    colors: ["Nude", "Maroon"],
    price: 20,
    rating: 4.4,
    reviews: 24,
    options: "Model-specific fit",
    image: cases,
    imageByColor: { Nude: cases, Maroon: cases },
  },
  {
    id: "af-wall-canvas",
    name: "Gallery Canvas Wall Art",
    category: "Wall Art",
    material: "Canvas",
    colors: ["Cream", "White"],
    price: 42,
    rating: 4.8,
    reviews: 36,
    options: "Poster, framed print or canvas",
    image: stationery,
    imageByColor: { Cream: stationery, White: stationery },
    productType: "pre-designed",
    sizes: ["8x10", "12x16", "18x24"],
    theme: "autumn",
  },
  {
    id: "af-keychain-acrylic",
    name: "Acrylic Charm Keychain",
    category: "Keychains",
    material: "Acrylic",
    colors: ["Clear", "Pink", "Black"],
    price: 9,
    rating: 4.6,
    reviews: 28,
    options: "Single or double-sided print",
    image: corporate,
    imageByColor: { Clear: corporate, Pink: corporate, Black: corporate },
    productType: "blank",
  },
  {
    id: "af-cap-classic",
    name: "Classic Embroidered Cap",
    category: "Caps",
    material: "100% Cotton",
    colors: ["Black", "Navy", "Cream"],
    price: 24,
    rating: 4.7,
    reviews: 54,
    options: "Front embroidery or heat transfer",
    image: apparel,
    imageByColor: { Black: apparel, Navy: apparel, Cream: apparel },
    productType: "blank",
    sizes: ["Adjustable"],
  },
  {
    id: "af-blank-mug",
    name: "Blank Ceramic Mug",
    category: "Mugs",
    material: "Ceramic",
    colors: ["White", "Cream", "Black"],
    price: 14,
    rating: 4.7,
    reviews: 67,
    options: "Ready for custom design",
    image: drinkware,
    imageByColor: { White: drinkware, Cream: drinkware, Black: drinkware },
    productType: "blank",
  },
  {
    id: "af-tee-colorway",
    name: "Colorway Crew T-Shirt",
    category: "T-Shirts",
    material: "100% Cotton",
    colors: ["White", "Black", "Navy", "Pink"],
    price: 25,
    rating: 4.8,
    reviews: 103,
    options: "XS-3XL, front and back print",
    image: apparel,
    imageByColor: { White: apparel, Black: apparel, Navy: apparel, Pink: apparel },
    productType: "blank",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  },
];

export const templateCategories = [
  "All",
  "Birthday",
  "Corporate Branding",
  "Typography",
  "Minimalist Art",
  "Holidays",
];

export type Template = {
  id: string;
  title: string;
  creator: string;
  category: string;
  fits: string;
  image: string;
};

export const templates: Template[] = [
  {
    id: "t1",
    title: "Golden Year Birthday",
    creator: "Studio Avril",
    category: "Birthday",
    fits: "Fits T-Shirts & Mugs",
    image: drinkware,
  },
  {
    id: "t2",
    title: "Monogram Crest",
    creator: "OsanPrints",
    category: "Corporate Branding",
    fits: "Fits Polos & Notebooks",
    image: stationery,
  },
  {
    id: "t3",
    title: "Serif Statement",
    creator: "Ink Lab",
    category: "Typography",
    fits: "Fits T-Shirts & Totes",
    image: apparel,
  },
  {
    id: "t4",
    title: "Quiet Arches",
    creator: "Studio Avril",
    category: "Minimalist Art",
    fits: "Fits Phone Cases",
    image: cases,
  },
  {
    id: "t5",
    title: "Festive Wine Wreath",
    creator: "OsanPrints",
    category: "Holidays",
    fits: "Fits Mugs & Cards",
    image: stationery,
  },
  {
    id: "t6",
    title: "Team Launch Kit",
    creator: "OsanPrints",
    category: "Corporate Branding",
    fits: "Fits Corporate Packages",
    image: corporate,
  },
  {
    id: "t7",
    title: "Confetti Bloom",
    creator: "Ink Lab",
    category: "Birthday",
    fits: "Fits Mugs & Tees",
    image: drinkware,
  },
  {
    id: "t8",
    title: "Bold Grotesque",
    creator: "Studio Avril",
    category: "Typography",
    fits: "Fits T-Shirts",
    image: apparel,
  },
  {
    id: "t9",
    title: "Soft Nude Lines",
    creator: "Ink Lab",
    category: "Minimalist Art",
    fits: "Fits Notebooks & Cases",
    image: stationery,
  },
];

export const coupons = [
  { code: "PRINT20", label: "20% off your first print order", note: "New customers · min. 1 item" },
  { code: "BULK30", label: "30% off orders of 50+ items", note: "Corporate & team merch" },
  { code: "SHIPFREE", label: "Free express shipping", note: "Orders above $120" },
  { code: "MUGPAIR", label: "Buy 2 mugs, get 1 free", note: "Drinkware only" },
];

export const discountTiers = [
  { range: "1 – 9 Items", discount: "Standard Price", items: "All catalog items" },
  { range: "10 – 49 Items", discount: "15% OFF", items: "T-Shirts, Mugs, Phone Cases" },
  { range: "50+ Items", discount: "30% OFF", items: "All products & corporate packages" },
];

export const faqs = [
  {
    q: "What artwork files do you accept?",
    a: "We accept PNG, SVG, AI and PSD files at 300 DPI minimum. For apparel, a transparent PNG sized to the print area gives the sharpest result.",
  },
  {
    q: "How long does production and shipping take?",
    a: "Single items print within 2–3 business days. Bulk runs of 50+ take 5–7 business days. Express shipping delivers in 2 days, standard in 4–6.",
  },
  {
    q: "Can I return a custom printed item?",
    a: "Custom prints are made to order, so we replace any item with a print defect, colour mismatch or shipping damage free of charge within 14 days.",
  },
  {
    q: "Do you colour match brand palettes?",
    a: "Yes. Share your HEX or Pantone references and our press operator calibrates ink before the run, with a digital proof sent for approval.",
  },
  {
    q: "Is there a minimum order quantity?",
    a: "No minimum. You can order a single mug or 500 branded kits — bulk discounts apply automatically at checkout.",
  },
];

export type AdminOrder = {
  id: string;
  customer: string;
  items: string;
  status: "In Production" | "Awaiting Print" | "Shipped" | "Design Review";
  payment: string;
  total: number;
  action: string;
};

export const adminOrders: AdminOrder[] = [
  {
    id: "#AF-1082",
    customer: "Sarah Jenkins",
    items: "1x Custom Mug, 2x Graphic Tees",
    status: "In Production",
    payment: "Paid (Stripe)",
    total: 64,
    action: "View Artwork / Update Status",
  },
  {
    id: "#AF-1083",
    customer: "Corporate Client",
    items: "50x Branded Phone Cases",
    status: "Awaiting Print",
    payment: "Paid (Mobile Money)",
    total: 735,
    action: "Download Vector Files",
  },
  {
    id: "#AF-1084",
    customer: "Daniel Osei",
    items: "12x Team Polos",
    status: "Design Review",
    payment: "Pending (Card)",
    total: 388,
    action: "Request Approval",
  },
  {
    id: "#AF-1085",
    customer: "Lina Baptiste",
    items: "3x Foil Notebooks",
    status: "Shipped",
    payment: "Paid (Stripe)",
    total: 54,
    action: "View Tracking",
  },
  {
    id: "#AF-1086",
    customer: "Northline Agency",
    items: "80x Welcome Kits",
    status: "In Production",
    payment: "Paid (Mobile Money)",
    total: 3808,
    action: "View Artwork / Update Status",
  },
];

export const adminDesigns = [
  {
    name: "Maple Crest Emblem",
    file: "maple-crest.svg",
    mockups: "Tee front · Mug wrap",
    price: 24,
    category: "Apparel",
    status: "Active",
  },
  {
    name: "Wine Bloom Pattern",
    file: "wine-bloom.png",
    mockups: "Mug wrap · Case back",
    price: 18,
    category: "Drinkware",
    status: "Active",
  },
  {
    name: "Serif Statement",
    file: "serif-statement.ai",
    mockups: "Tee front",
    price: 26,
    category: "Apparel",
    status: "Draft",
  },
  {
    name: "Corporate Monogram",
    file: "corp-mono.psd",
    mockups: "Polo chest · Notebook",
    price: 32,
    category: "Corporate",
    status: "Active",
  },
  {
    name: "Nude Arches",
    file: "nude-arches.svg",
    mockups: "Case back",
    price: 21,
    category: "Phone Cases",
    status: "Out of Stock",
  },
];

export const payments: any[] = [];

export const revenueSeries: any[] = [];

export const adminCustomers = [
  { name: "Sarah Jenkins", email: "sarah.j@mail.com", orders: 7, spend: 412, since: "2025" },
  { name: "Northline Agency", email: "ops@northline.co", orders: 4, spend: 6120, since: "2024" },
  { name: "Daniel Osei", email: "d.osei@mail.com", orders: 3, spend: 588, since: "2026" },
  { name: "Lina Baptiste", email: "lina.b@mail.com", orders: 11, spend: 734, since: "2024" },
  {
    name: "Corporate Client Ltd",
    email: "print@corpclient.com",
    orders: 2,
    spend: 1470,
    since: "2026",
  },
];
