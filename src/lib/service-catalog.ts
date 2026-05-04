// Built-in service catalog inspired by Sheba.xyz categories.
// Owners pick an item to auto-fill name, description, unit, duration, etc.
// Areas list is used for the "Available in" multi-select.

export type CatalogItem = {
  slug: string;
  category_en: string;
  category_bn: string;
  name_en: string;
  name_bn: string;
  description_en: string;
  description_bn: string;
  default_unit?: string; // service | hour | visit | job
  default_duration_minutes?: number | null;
  default_duration_label?: string | null;
  warranty_default?: { value: number; unit: "days" | "months" | "years" } | null;
  home_service_default?: boolean;
};

export const BD_DIVISIONS: { code: string; name_en: string; name_bn: string }[] = [
  { code: "Dhaka", name_en: "Dhaka", name_bn: "ঢাকা" },
  { code: "Chattogram", name_en: "Chattogram", name_bn: "চট্টগ্রাম" },
  { code: "Khulna", name_en: "Khulna", name_bn: "খুলনা" },
  { code: "Rajshahi", name_en: "Rajshahi", name_bn: "রাজশাহী" },
  { code: "Sylhet", name_en: "Sylhet", name_bn: "সিলেট" },
  { code: "Barishal", name_en: "Barishal", name_bn: "বরিশাল" },
  { code: "Rangpur", name_en: "Rangpur", name_bn: "রংপুর" },
  { code: "Mymensingh", name_en: "Mymensingh", name_bn: "ময়মনসিংহ" },
];

export const SERVICE_CATALOG: CatalogItem[] = [
  // ── Beauty & Wellness ──
  { slug: "salon-men", category_en: "Beauty & Wellness", category_bn: "বিউটি ও ওয়েলনেস", name_en: "Salon for Men", name_bn: "পুরুষ সেলুন", description_en: "Haircut, shave, basic facial and head massage for men at a professional salon or at home.", description_bn: "বাসায় কিংবা সেলুনে চুল কাটা, শেভ, বেসিক ফেসিয়াল এবং হেড ম্যাসাজ — পুরুষদের জন্য।", default_unit: "service", default_duration_minutes: 45, home_service_default: true },
  { slug: "salon-women", category_en: "Beauty & Wellness", category_bn: "বিউটি ও ওয়েলনেস", name_en: "Salon for Women", name_bn: "মহিলা সেলুন", description_en: "Haircut, threading, facial, manicure-pedicure and grooming for women.", description_bn: "চুল কাটা, থ্রেডিং, ফেসিয়াল, ম্যানিকিউর-পেডিকিউর এবং গ্রুমিং — মহিলাদের জন্য।", default_unit: "service", default_duration_minutes: 60, home_service_default: true },
  { slug: "bridal-makeup", category_en: "Beauty & Wellness", category_bn: "বিউটি ও ওয়েলনেস", name_en: "Bridal Makeup", name_bn: "ব্রাইডাল মেকআপ", description_en: "Professional bridal makeup including base, eye, lips and hair styling for the wedding day.", description_bn: "বিয়ের দিনের জন্য পেশাদার ব্রাইডাল মেকআপ — বেস, আই, লিপ ও হেয়ার স্টাইলিং সহ।", default_unit: "service", default_duration_label: "2-3 hours", home_service_default: true },
  { slug: "hair-cut", category_en: "Beauty & Wellness", category_bn: "বিউটি ও ওয়েলনেস", name_en: "Hair Cut", name_bn: "চুল কাটা", description_en: "Standard hair cut and styling.", description_bn: "স্ট্যান্ডার্ড চুল কাটা ও স্টাইলিং।", default_unit: "service", default_duration_minutes: 30 },
  { slug: "hair-color", category_en: "Beauty & Wellness", category_bn: "বিউটি ও ওয়েলনেস", name_en: "Hair Color", name_bn: "হেয়ার কালার", description_en: "Premium hair coloring with branded products.", description_bn: "ব্র্যান্ডেড পণ্য দিয়ে প্রিমিয়াম হেয়ার কালার।", default_unit: "service", default_duration_minutes: 90 },
  { slug: "facial", category_en: "Beauty & Wellness", category_bn: "বিউটি ও ওয়েলনেস", name_en: "Facial", name_bn: "ফেসিয়াল", description_en: "Cleansing, scrub, mask and moisturizing facial treatment.", description_bn: "ক্লিনজিং, স্ক্রাব, মাস্ক ও ময়েশ্চারাইজিং ফেসিয়াল।", default_unit: "service", default_duration_minutes: 45 },
  { slug: "mani-pedi", category_en: "Beauty & Wellness", category_bn: "বিউটি ও ওয়েলনেস", name_en: "Manicure & Pedicure", name_bn: "ম্যানিকিউর ও পেডিকিউর", description_en: "Nail shaping, cuticle care, scrub and polish for hands and feet.", description_bn: "হাত-পায়ের নখের শেপিং, কিউটিকল কেয়ার, স্ক্রাব ও পলিশ।", default_unit: "service", default_duration_minutes: 60 },
  { slug: "body-massage", category_en: "Beauty & Wellness", category_bn: "বিউটি ও ওয়েলনেস", name_en: "Body Massage", name_bn: "বডি ম্যাসাজ", description_en: "Full-body relaxation massage by a trained therapist.", description_bn: "প্রশিক্ষিত থেরাপিস্ট দ্বারা ফুল-বডি রিল্যাক্সেশন ম্যাসাজ।", default_unit: "hour", default_duration_minutes: 60, home_service_default: true },

  // ── Home Cleaning ──
  { slug: "full-home-clean", category_en: "Home Cleaning", category_bn: "হোম ক্লিনিং", name_en: "Full Home Cleaning", name_bn: "ফুল হোম ক্লিনিং", description_en: "Deep cleaning of every room — floor, walls, doors, switches, fans and windows.", description_bn: "প্রতিটি রুমের গভীর পরিষ্কার — মেঝে, দেয়াল, দরজা, সুইচ, ফ্যান ও জানালা।", default_unit: "job", default_duration_label: "4-6 hours", home_service_default: true },
  { slug: "kitchen-deep-clean", category_en: "Home Cleaning", category_bn: "হোম ক্লিনিং", name_en: "Kitchen Deep Clean", name_bn: "কিচেন ডিপ ক্লিন", description_en: "Degreasing of stove, hood, cabinets, walls, sink and floor.", description_bn: "চুলা, হুড, ক্যাবিনেট, দেয়াল, সিঙ্ক ও মেঝের তেল-ময়লা পরিষ্কার।", default_unit: "job", default_duration_minutes: 180, home_service_default: true },
  { slug: "bathroom-deep-clean", category_en: "Home Cleaning", category_bn: "হোম ক্লিনিং", name_en: "Bathroom Deep Clean", name_bn: "বাথরুম ডিপ ক্লিন", description_en: "Tile, commode, basin and fittings deep clean with disinfection.", description_bn: "টাইলস, কমোড, বেসিন ও ফিটিংসের গভীর পরিষ্কার এবং জীবাণুমুক্তকরণ।", default_unit: "job", default_duration_minutes: 90, home_service_default: true },
  { slug: "sofa-clean", category_en: "Home Cleaning", category_bn: "হোম ক্লিনিং", name_en: "Sofa Cleaning", name_bn: "সোফা ক্লিনিং", description_en: "Vacuum, shampoo and deep cleaning of sofa fabric and cushions.", description_bn: "সোফার কাপড় ও কুশনের ভ্যাকুয়াম, শ্যাম্পু এবং গভীর পরিষ্কার।", default_unit: "job", home_service_default: true },
  { slug: "mattress-clean", category_en: "Home Cleaning", category_bn: "হোম ক্লিনিং", name_en: "Mattress Cleaning", name_bn: "ম্যাট্রেস ক্লিনিং", description_en: "Anti-bacterial mattress cleaning to remove dust mites and stains.", description_bn: "ধুলা-জীবাণু ও দাগ দূর করতে অ্যান্টি-ব্যাকটেরিয়াল ম্যাট্রেস ক্লিনিং।", default_unit: "job", home_service_default: true },
  { slug: "carpet-clean", category_en: "Home Cleaning", category_bn: "হোম ক্লিনিং", name_en: "Carpet Cleaning", name_bn: "কার্পেট ক্লিনিং", description_en: "Shampoo wash and dry of carpet of any size.", description_bn: "যেকোনো সাইজের কার্পেটের শ্যাম্পু ওয়াশ ও শুকানো।", default_unit: "job", home_service_default: true },
  { slug: "water-tank-clean", category_en: "Home Cleaning", category_bn: "হোম ক্লিনিং", name_en: "Water Tank Cleaning", name_bn: "ওয়াটার ট্যাংক ক্লিনিং", description_en: "Underground or rooftop water tank cleaning and disinfection.", description_bn: "আন্ডারগ্রাউন্ড বা ছাদের পানির ট্যাংক পরিষ্কার ও জীবাণুমুক্তকরণ।", default_unit: "job", home_service_default: true },

  // ── Appliance Repair ──
  { slug: "ac-service", category_en: "Appliance Repair", category_bn: "অ্যাপ্লায়েন্স রিপেয়ার", name_en: "AC General Service", name_bn: "এসি সার্ভিসিং", description_en: "Filter wash, indoor & outdoor unit cleaning, gas pressure check.", description_bn: "ফিল্টার ওয়াশ, ইনডোর-আউটডোর ইউনিট ক্লিনিং, গ্যাস প্রেসার চেক।", default_unit: "service", default_duration_minutes: 60, warranty_default: { value: 30, unit: "days" }, home_service_default: true },
  { slug: "ac-repair", category_en: "Appliance Repair", category_bn: "অ্যাপ্লায়েন্স রিপেয়ার", name_en: "AC Repair", name_bn: "এসি রিপেয়ার", description_en: "Diagnosis and repair of cooling, gas leak, PCB and compressor issues.", description_bn: "কুলিং, গ্যাস লিক, পিসিবি ও কম্প্রেসর সমস্যার ডায়াগনোসিস ও মেরামত।", default_unit: "job", warranty_default: { value: 60, unit: "days" }, home_service_default: true },
  { slug: "ac-install", category_en: "Appliance Repair", category_bn: "অ্যাপ্লায়েন্স রিপেয়ার", name_en: "AC Installation", name_bn: "এসি ইনস্টলেশন", description_en: "Wall mount install with copper piping, drain pipe and electrical work.", description_bn: "কপার পাইপ, ড্রেন পাইপ ও ইলেকট্রিক্যাল কাজসহ ওয়াল-মাউন্ট ইনস্টলেশন।", default_unit: "job", warranty_default: { value: 90, unit: "days" }, home_service_default: true },
  { slug: "fridge-repair", category_en: "Appliance Repair", category_bn: "অ্যাপ্লায়েন্স রিপেয়ার", name_en: "Refrigerator Repair", name_bn: "ফ্রিজ রিপেয়ার", description_en: "Cooling problem, gas refill, thermostat and compressor repair.", description_bn: "কুলিং সমস্যা, গ্যাস রিফিল, থার্মোস্ট্যাট ও কম্প্রেসর মেরামত।", default_unit: "job", warranty_default: { value: 60, unit: "days" }, home_service_default: true },
  { slug: "washing-machine-repair", category_en: "Appliance Repair", category_bn: "অ্যাপ্লায়েন্স রিপেয়ার", name_en: "Washing Machine Repair", name_bn: "ওয়াশিং মেশিন রিপেয়ার", description_en: "Drum, motor, drainage and PCB repair for top/front-load machines.", description_bn: "টপ/ফ্রন্ট-লোড মেশিনের ড্রাম, মোটর, ড্রেনেজ ও পিসিবি মেরামত।", default_unit: "job", warranty_default: { value: 60, unit: "days" }, home_service_default: true },
  { slug: "microwave-repair", category_en: "Appliance Repair", category_bn: "অ্যাপ্লায়েন্স রিপেয়ার", name_en: "Microwave Repair", name_bn: "মাইক্রোওয়েভ রিপেয়ার", description_en: "Heating, magnetron, fuse and turntable repair.", description_bn: "হিটিং, ম্যাগনেট্রন, ফিউজ ও টার্নটেবল মেরামত।", default_unit: "job", warranty_default: { value: 30, unit: "days" }, home_service_default: true },
  { slug: "tv-repair", category_en: "Appliance Repair", category_bn: "অ্যাপ্লায়েন্স রিপেয়ার", name_en: "TV Repair", name_bn: "টিভি রিপেয়ার", description_en: "LED/LCD/Smart TV display, panel, sound and software repair.", description_bn: "LED/LCD/স্মার্ট টিভির ডিসপ্লে, প্যানেল, সাউন্ড ও সফটওয়্যার মেরামত।", default_unit: "job", warranty_default: { value: 60, unit: "days" }, home_service_default: true },
  { slug: "geyser-repair", category_en: "Appliance Repair", category_bn: "অ্যাপ্লায়েন্স রিপেয়ার", name_en: "Geyser Repair", name_bn: "গিজার রিপেয়ার", description_en: "Heating element, thermostat and tank service for water heaters.", description_bn: "ওয়াটার হিটারের হিটিং এলিমেন্ট, থার্মোস্ট্যাট ও ট্যাংক সার্ভিস।", default_unit: "job", warranty_default: { value: 60, unit: "days" }, home_service_default: true },
  { slug: "water-filter-service", category_en: "Appliance Repair", category_bn: "অ্যাপ্লায়েন্স রিপেয়ার", name_en: "Water Filter Service", name_bn: "ওয়াটার ফিল্টার সার্ভিস", description_en: "Cartridge change, RO membrane and pump service.", description_bn: "কার্ট্রিজ পরিবর্তন, আরও মেমব্রেন ও পাম্প সার্ভিস।", default_unit: "service", home_service_default: true },

  // ── Plumbing ──
  { slug: "tap-fix", category_en: "Plumbing", category_bn: "প্লাম্বিং", name_en: "Tap / Faucet Repair", name_bn: "কল / ট্যাপ মেরামত", description_en: "Leakage and replacement of bathroom and kitchen taps.", description_bn: "বাথরুম ও কিচেনের কলের লিকেজ ও পরিবর্তন।", default_unit: "job", home_service_default: true },
  { slug: "pipe-leak", category_en: "Plumbing", category_bn: "প্লাম্বিং", name_en: "Pipe Leakage", name_bn: "পাইপ লিকেজ", description_en: "Detect and repair water pipe leakage in walls or floor.", description_bn: "দেয়াল বা মেঝের ভিতরের পানির পাইপ লিকেজ সনাক্ত ও মেরামত।", default_unit: "job", home_service_default: true },
  { slug: "toilet-repair", category_en: "Plumbing", category_bn: "প্লাম্বিং", name_en: "Toilet Repair", name_bn: "টয়লেট রিপেয়ার", description_en: "Commode flush, water tank and seat repair / replacement.", description_bn: "কমোড ফ্লাশ, ওয়াটার ট্যাংক ও সিট মেরামত / পরিবর্তন।", default_unit: "job", home_service_default: true },
  { slug: "bathroom-fittings", category_en: "Plumbing", category_bn: "প্লাম্বিং", name_en: "Bathroom Fittings", name_bn: "বাথরুম ফিটিংস", description_en: "Shower, hand-wash basin, mirror and towel rod installation.", description_bn: "শাওয়ার, বেসিন, আয়না ও তোয়ালে রড ইনস্টলেশন।", default_unit: "job", home_service_default: true },
  { slug: "water-motor", category_en: "Plumbing", category_bn: "প্লাম্বিং", name_en: "Water Pump / Motor", name_bn: "ওয়াটার পাম্প / মোটর", description_en: "Water pump, motor and pressure switch repair or installation.", description_bn: "ওয়াটার পাম্প, মোটর ও প্রেসার সুইচ মেরামত বা ইনস্টলেশন।", default_unit: "job", home_service_default: true },

  // ── Electrical ──
  { slug: "wiring", category_en: "Electrical", category_bn: "ইলেকট্রিক্যাল", name_en: "House Wiring", name_bn: "হাউস ওয়্যারিং", description_en: "New or rework wiring for rooms, kitchen, bathroom or full house.", description_bn: "রুম, কিচেন, বাথরুম বা ফুল হাউসের নতুন বা রিওয়ার্ক ওয়্যারিং।", default_unit: "job", home_service_default: true },
  { slug: "switch-socket", category_en: "Electrical", category_bn: "ইলেকট্রিক্যাল", name_en: "Switch / Socket Fix", name_bn: "সুইচ / সকেট মেরামত", description_en: "Replace or repair faulty switch, socket and circuit board.", description_bn: "নষ্ট সুইচ, সকেট ও সার্কিট বোর্ড মেরামত বা পরিবর্তন।", default_unit: "job", home_service_default: true },
  { slug: "fan-install", category_en: "Electrical", category_bn: "ইলেকট্রিক্যাল", name_en: "Fan Install / Repair", name_bn: "ফ্যান ইনস্টল / রিপেয়ার", description_en: "Ceiling, table and exhaust fan installation, capacitor or motor repair.", description_bn: "সিলিং, টেবিল ও এক্সহস্ট ফ্যান ইনস্টলেশন, ক্যাপাসিটর বা মোটর মেরামত।", default_unit: "job", home_service_default: true },
  { slug: "light-install", category_en: "Electrical", category_bn: "ইলেকট্রিক্যাল", name_en: "Light Installation", name_bn: "লাইট ইনস্টলেশন", description_en: "LED panel, chandelier, false-ceiling and decorative light install.", description_bn: "LED প্যানেল, ঝাড়বাতি, ফলস-সিলিং ও ডেকোরেটিভ লাইট ইনস্টলেশন।", default_unit: "job", home_service_default: true },
  { slug: "ips-ups", category_en: "Electrical", category_bn: "ইলেকট্রিক্যাল", name_en: "IPS / UPS Service", name_bn: "IPS / UPS সার্ভিস", description_en: "Battery check, charger and inverter board service.", description_bn: "ব্যাটারি চেক, চার্জার ও ইনভার্টার বোর্ড সার্ভিস।", default_unit: "job", home_service_default: true },
  { slug: "generator", category_en: "Electrical", category_bn: "ইলেকট্রিক্যাল", name_en: "Generator Service", name_bn: "জেনারেটর সার্ভিস", description_en: "Diesel/petrol generator service, oil change and tune-up.", description_bn: "ডিজেল/পেট্রল জেনারেটর সার্ভিস, অয়েল চেঞ্জ ও টিউন-আপ।", default_unit: "job", home_service_default: true },

  // ── Pest Control ──
  { slug: "cockroach", category_en: "Pest Control", category_bn: "পেস্ট কন্ট্রোল", name_en: "Cockroach Control", name_bn: "তেলাপোকা নিয়ন্ত্রণ", description_en: "Gel and spray treatment to eliminate cockroaches.", description_bn: "জেল ও স্প্রে ট্রিটমেন্টের মাধ্যমে তেলাপোকা দমন।", default_unit: "job", warranty_default: { value: 3, unit: "months" }, home_service_default: true },
  { slug: "bedbug", category_en: "Pest Control", category_bn: "পেস্ট কন্ট্রোল", name_en: "Bedbug Control", name_bn: "ছারপোকা নিয়ন্ত্রণ", description_en: "Mattress, sofa and corner spray to remove bedbugs.", description_bn: "ম্যাট্রেস, সোফা ও কর্নার স্প্রে দিয়ে ছারপোকা দূর।", default_unit: "job", warranty_default: { value: 3, unit: "months" }, home_service_default: true },
  { slug: "termite", category_en: "Pest Control", category_bn: "পেস্ট কন্ট্রোল", name_en: "Termite Control", name_bn: "উইপোকা নিয়ন্ত্রণ", description_en: "Anti-termite chemical treatment for furniture and walls.", description_bn: "ফার্নিচার ও দেয়ালের জন্য অ্যান্টি-টারমাইট কেমিক্যাল ট্রিটমেন্ট।", default_unit: "job", warranty_default: { value: 6, unit: "months" }, home_service_default: true },
  { slug: "rat", category_en: "Pest Control", category_bn: "পেস্ট কন্ট্রোল", name_en: "Rat Control", name_bn: "ইঁদুর নিয়ন্ত্রণ", description_en: "Bait and trap based rat removal solution.", description_bn: "বেইট ও ট্র্যাপ ব্যবহার করে ইঁদুর দূরীকরণ।", default_unit: "job", home_service_default: true },
  { slug: "mosquito", category_en: "Pest Control", category_bn: "পেস্ট কন্ট্রোল", name_en: "Mosquito Control", name_bn: "মশা নিয়ন্ত্রণ", description_en: "Indoor fogging and larvicidal treatment.", description_bn: "ইনডোর ফগিং ও লার্ভিসাইডাল ট্রিটমেন্ট।", default_unit: "job", home_service_default: true },

  // ── Car Services ──
  { slug: "car-wash", category_en: "Car Services", category_bn: "গাড়ির সার্ভিস", name_en: "Car Wash & Detail", name_bn: "কার ওয়াশ ও ডিটেইল", description_en: "Foam wash, vacuum, dashboard polish and tire dressing.", description_bn: "ফোম ওয়াশ, ভ্যাকুয়াম, ড্যাশবোর্ড পলিশ ও টায়ার ড্রেসিং।", default_unit: "service", default_duration_minutes: 60, home_service_default: true },
  { slug: "car-ac", category_en: "Car Services", category_bn: "গাড়ির সার্ভিস", name_en: "Car AC Service", name_bn: "কার এসি সার্ভিস", description_en: "AC gas, blower, cooling coil cleaning for cars.", description_bn: "গাড়ির এসি গ্যাস, ব্লোয়ার ও কুলিং কয়েল পরিষ্কার।", default_unit: "service", warranty_default: { value: 30, unit: "days" } },
  { slug: "engine-tuneup", category_en: "Car Services", category_bn: "গাড়ির সার্ভিস", name_en: "Engine Tune-up", name_bn: "ইঞ্জিন টিউন-আপ", description_en: "Plug, oil, filter change and engine tuning.", description_bn: "প্লাগ, অয়েল, ফিল্টার পরিবর্তন ও ইঞ্জিন টিউনিং।", default_unit: "service" },
  { slug: "battery", category_en: "Car Services", category_bn: "গাড়ির সার্ভিস", name_en: "Car Battery", name_bn: "কার ব্যাটারি", description_en: "Battery check, charging or replacement.", description_bn: "ব্যাটারি চেক, চার্জিং বা পরিবর্তন।", default_unit: "service", home_service_default: true },
  { slug: "tyre", category_en: "Car Services", category_bn: "গাড়ির সার্ভিস", name_en: "Tyre Service", name_bn: "টায়ার সার্ভিস", description_en: "Wheel balance, alignment and tyre change.", description_bn: "হুইল ব্যালান্স, এলাইনমেন্ট ও টায়ার পরিবর্তন।", default_unit: "service" },
  { slug: "body-paint", category_en: "Car Services", category_bn: "গাড়ির সার্ভিস", name_en: "Body Paint & Dent", name_bn: "বডি পেইন্ট ও ডেন্ট", description_en: "Dent removal, scratch repair and full body paint.", description_bn: "ডেন্ট রিমুভাল, স্ক্র্যাচ মেরামত ও ফুল বডি পেইন্ট।", default_unit: "job" },

  // ── Carpentry & Painting ──
  { slug: "furniture-repair", category_en: "Carpentry & Painting", category_bn: "কার্পেন্ট্রি ও পেইন্টিং", name_en: "Furniture Repair", name_bn: "ফার্নিচার মেরামত", description_en: "Repair of bed, almirah, chair and table.", description_bn: "বেড, আলমিরা, চেয়ার ও টেবিলের মেরামত।", default_unit: "job", home_service_default: true },
  { slug: "door-window", category_en: "Carpentry & Painting", category_bn: "কার্পেন্ট্রি ও পেইন্টিং", name_en: "Door / Window Work", name_bn: "দরজা / জানালা", description_en: "Door, window installation, lock fitting and grill repair.", description_bn: "দরজা, জানালা ইনস্টলেশন, লক ফিটিং ও গ্রিল মেরামত।", default_unit: "job", home_service_default: true },
  { slug: "interior-paint", category_en: "Carpentry & Painting", category_bn: "কার্পেন্ট্রি ও পেইন্টিং", name_en: "Interior Painting", name_bn: "ইন্টেরিয়র পেইন্টিং", description_en: "Wall putty, primer and emulsion paint inside the home.", description_bn: "বাড়ির ভিতরে ওয়াল পুটি, প্রাইমার ও ইমালশন পেইন্ট।", default_unit: "job", home_service_default: true },
  { slug: "exterior-paint", category_en: "Carpentry & Painting", category_bn: "কার্পেন্ট্রি ও পেইন্টিং", name_en: "Exterior Painting", name_bn: "এক্সটেরিয়র পেইন্টিং", description_en: "Weather-coat exterior wall painting.", description_bn: "ওয়েদার-কোট বাইরের দেয়াল পেইন্টিং।", default_unit: "job", home_service_default: true },
  { slug: "polishing", category_en: "Carpentry & Painting", category_bn: "কার্পেন্ট্রি ও পেইন্টিং", name_en: "Wood Polishing", name_bn: "কাঠ পলিশিং", description_en: "Furniture and door polish with melamine or PU.", description_bn: "মেলামাইন বা পিইউ দিয়ে ফার্নিচার ও দরজার পলিশ।", default_unit: "job", home_service_default: true },

  // ── CCTV / IT / Networking ──
  { slug: "cctv-install", category_en: "CCTV / IT / Networking", category_bn: "সিসিটিভি / আইটি", name_en: "CCTV Installation", name_bn: "সিসিটিভি ইনস্টলেশন", description_en: "Camera, DVR/NVR installation with cabling and monitor setup.", description_bn: "ক্যামেরা, DVR/NVR ইনস্টলেশন, ক্যাবলিং ও মনিটর সেটআপ সহ।", default_unit: "job", warranty_default: { value: 6, unit: "months" }, home_service_default: true },
  { slug: "cctv-maintain", category_en: "CCTV / IT / Networking", category_bn: "সিসিটিভি / আইটি", name_en: "CCTV Maintenance", name_bn: "সিসিটিভি মেইন্টেন্যান্স", description_en: "Existing CCTV system service, lens cleaning and HDD check.", description_bn: "বিদ্যমান সিসিটিভি সিস্টেম সার্ভিস, লেন্স পরিষ্কার ও HDD চেক।", default_unit: "service", home_service_default: true },
  { slug: "computer-repair", category_en: "CCTV / IT / Networking", category_bn: "সিসিটিভি / আইটি", name_en: "Computer Repair", name_bn: "কম্পিউটার রিপেয়ার", description_en: "Hardware, OS install, virus removal and tune-up for desktops.", description_bn: "ডেস্কটপের হার্ডওয়্যার, OS ইনস্টল, ভাইরাস রিমুভাল ও টিউন-আপ।", default_unit: "service", home_service_default: true },
  { slug: "laptop-repair", category_en: "CCTV / IT / Networking", category_bn: "সিসিটিভি / আইটি", name_en: "Laptop Repair", name_bn: "ল্যাপটপ রিপেয়ার", description_en: "Battery, keyboard, screen and motherboard repair.", description_bn: "ব্যাটারি, কী-বোর্ড, স্ক্রিন ও মাদারবোর্ড মেরামত।", default_unit: "service" },
  { slug: "wifi-setup", category_en: "CCTV / IT / Networking", category_bn: "সিসিটিভি / আইটি", name_en: "Wi-Fi / Router Setup", name_bn: "ওয়াই-ফাই / রাউটার সেটআপ", description_en: "Router config, mesh setup and signal optimization.", description_bn: "রাউটার কনফিগ, মেশ সেটআপ ও সিগন্যাল অপটিমাইজেশন।", default_unit: "service", home_service_default: true },
  { slug: "printer-repair", category_en: "CCTV / IT / Networking", category_bn: "সিসিটিভি / আইটি", name_en: "Printer Repair", name_bn: "প্রিন্টার রিপেয়ার", description_en: "Inkjet/laser printer head, roller and cartridge service.", description_bn: "ইঙ্কজেট/লেজার প্রিন্টারের হেড, রোলার ও কার্ট্রিজ সার্ভিস।", default_unit: "service" },

  // ── Shifting ──
  { slug: "home-shifting", category_en: "Shifting / Movers", category_bn: "শিফটিং / মুভার্স", name_en: "Home Shifting", name_bn: "হোম শিফটিং", description_en: "House shifting with packing, loading, transport and unpacking.", description_bn: "প্যাকিং, লোডিং, পরিবহন ও আনপ্যাকিং সহ ঘর শিফটিং।", default_unit: "job", home_service_default: true },
  { slug: "office-shifting", category_en: "Shifting / Movers", category_bn: "শিফটিং / মুভার্স", name_en: "Office Shifting", name_bn: "অফিস শিফটিং", description_en: "Office furniture and equipment shifting and reinstall.", description_bn: "অফিসের ফার্নিচার ও সরঞ্জাম শিফটিং ও পুনঃস্থাপন।", default_unit: "job", home_service_default: true },
  { slug: "pick-drop", category_en: "Shifting / Movers", category_bn: "শিফটিং / মুভার্স", name_en: "Pick & Drop", name_bn: "পিক অ্যান্ড ড্রপ", description_en: "Single-item or small load pick-up and drop-off service.", description_bn: "একক আইটেম বা ছোট মালামালের পিক-আপ ও ড্রপ-অফ সার্ভিস।", default_unit: "service", home_service_default: true },

  // ── Health at Home ──
  { slug: "doctor-visit", category_en: "Health at Home", category_bn: "হেল্থ অ্যাট হোম", name_en: "Doctor Visit", name_bn: "ডাক্তার ভিজিট", description_en: "Qualified doctor home visit and consultation.", description_bn: "যোগ্য ডাক্তারের বাসায় ভিজিট ও পরামর্শ।", default_unit: "visit", home_service_default: true },
  { slug: "nurse", category_en: "Health at Home", category_bn: "হেল্থ অ্যাট হোম", name_en: "Nurse at Home", name_bn: "নার্স অ্যাট হোম", description_en: "Trained nurse for injection, dressing or elderly care.", description_bn: "ইনজেকশন, ড্রেসিং বা বৃদ্ধ যত্নের জন্য প্রশিক্ষিত নার্স।", default_unit: "visit", home_service_default: true },
  { slug: "physio", category_en: "Health at Home", category_bn: "হেল্থ অ্যাট হোম", name_en: "Physiotherapy", name_bn: "ফিজিওথেরাপি", description_en: "Home physiotherapy session with certified therapist.", description_bn: "সার্টিফাইড থেরাপিস্ট দ্বারা বাসায় ফিজিওথেরাপি সেশন।", default_unit: "visit", home_service_default: true },
  { slug: "sample-collection", category_en: "Health at Home", category_bn: "হেল্থ অ্যাট হোম", name_en: "Sample Collection", name_bn: "স্যাম্পল কালেকশন", description_en: "Blood and urine sample collection at home for lab tests.", description_bn: "ল্যাব টেস্টের জন্য বাসায় রক্ত ও প্রস্রাব স্যাম্পল কালেকশন।", default_unit: "visit", home_service_default: true },

  // ── Tutoring ──
  { slug: "home-tutor", category_en: "Tutoring & Lessons", category_bn: "টিউটরিং", name_en: "Home Tutor", name_bn: "হোম টিউটর", description_en: "Subject tutor for school/college students at student's home.", description_bn: "ছাত্রের বাসায় গিয়ে স্কুল/কলেজ শিক্ষার্থীর সাবজেক্ট টিউটর।", default_unit: "hour", home_service_default: true },
  { slug: "music-lesson", category_en: "Tutoring & Lessons", category_bn: "টিউটরিং", name_en: "Music Lesson", name_bn: "মিউজিক লেসন", description_en: "Vocal, guitar or keyboard lessons.", description_bn: "ভোকাল, গিটার বা কী-বোর্ড লেসন।", default_unit: "hour" },
  { slug: "quran-tutor", category_en: "Tutoring & Lessons", category_bn: "টিউটরিং", name_en: "Quran Tutor", name_bn: "কুরআন টিউটর", description_en: "Quran reading and tajweed teacher at home.", description_bn: "বাসায় কুরআন তিলাওয়াত ও তাজবিদ শিক্ষক।", default_unit: "hour", home_service_default: true },

  // ── Events & Catering ──
  { slug: "catering", category_en: "Events & Catering", category_bn: "ইভেন্ট ও ক্যাটারিং", name_en: "Catering Service", name_bn: "ক্যাটারিং সার্ভিস", description_en: "Event meal catering with menu, cooking, serving and cleanup.", description_bn: "মেনু, রান্না, পরিবেশনা ও ক্লিনআপসহ ইভেন্ট খাবার ক্যাটারিং।", default_unit: "service" },
  { slug: "photography", category_en: "Events & Catering", category_bn: "ইভেন্ট ও ক্যাটারিং", name_en: "Event Photography", name_bn: "ইভেন্ট ফটোগ্রাফি", description_en: "Wedding/birthday/corporate event photography with edited delivery.", description_bn: "বিয়ে/জন্মদিন/কর্পোরেট ইভেন্ট ফটোগ্রাফি ও এডিটেড ডেলিভারি।", default_unit: "service" },
  { slug: "videography", category_en: "Events & Catering", category_bn: "ইভেন্ট ও ক্যাটারিং", name_en: "Event Videography", name_bn: "ইভেন্ট ভিডিওগ্রাফি", description_en: "Cinematic event videography with trailer and full film.", description_bn: "ট্রেলার ও ফুল ফিল্ম সহ সিনেম্যাটিক ইভেন্ট ভিডিওগ্রাফি।", default_unit: "service" },
  { slug: "decoration", category_en: "Events & Catering", category_bn: "ইভেন্ট ও ক্যাটারিং", name_en: "Event Decoration", name_bn: "ইভেন্ট ডেকোরেশন", description_en: "Stage, gate and table decoration for events.", description_bn: "স্টেজ, গেট ও টেবিল ডেকোরেশন।", default_unit: "service" },
];

export function catalogCategoriesGrouped(lang: "en" | "bn") {
  const map = new Map<string, CatalogItem[]>();
  for (const item of SERVICE_CATALOG) {
    const key = lang === "bn" ? item.category_bn : item.category_en;
    const arr = map.get(key) ?? [];
    arr.push(item);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}
