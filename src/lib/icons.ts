// Lucide-based icon registry. Each key maps to a Lucide React component.
// Use either `<AppIcon name="..." />` or pull a component out: `const I = icons.foo; <I className="..." />`.
import {
  Home, ShoppingCart, ShoppingBag, Zap, Wallet, Package, Boxes,
  Users, ListOrdered, ClipboardList, HandCoins, Receipt, AlertCircle,
  ShieldCheck, Trash2, KeyRound, Printer, BarChart3, Megaphone,
  Store, GraduationCap, BadgeDollarSign, Bookmark, Clock, User,
  UserCog, Banknote, ArrowDownToLine, ArrowUpFromLine,
  Heart, Bell, Languages, Settings, Search, Plus, UserPlus, ImagePlus,
  Pencil, Eye, EyeOff, Download, FileText, RefreshCw, Image as ImageIcon,
  Network, LayoutDashboard, ShieldAlert, ArrowDownCircle, ArrowUpCircle,
  Truck, FileSpreadsheet, TrendingUp, PieChart, ArrowLeft,
  StickyNote, BookOpen, type LucideIcon,
} from "lucide-react";
import type { ComponentProps } from "react";

export const icons = {
  home: Home,
  sell: ShoppingCart,
  purchase: ShoppingBag,
  quickSell: Zap,
  cashbox: Wallet,
  productList: Package,
  stock: Boxes,
  contact: Users,
  salesList: ListOrdered,
  purchaseList: ClipboardList,
  due: HandCoins,
  expense: Receipt,
  expired: AlertCircle,
  warranty: ShieldCheck,
  recycle: Trash2,
  access: KeyRound,
  printer: Printer,
  businessReport: BarChart3,
  marketing: Megaphone,
  onlineShop: Store,
  training: GraduationCap,
  buySubscription: BadgeDollarSign,
  bookmark: Bookmark,
  activeWarranty: ShieldCheck,
  pendingOrder: Clock,
  customer: User,
  employee: UserCog,
  alert: AlertCircle,
  cash: Banknote,
  cashRegister: Wallet,
  transaction: ArrowLeftRightSafe,
  wishlist: BookOpen,
  notification: Bell,
  language: Languages,
  settings: Settings,
  search: Search,
  add: Plus,
  addUser: UserPlus,
  addImage: ImagePlus,
  edit: Pencil,
  delete: Trash2,
  eye: Eye,
  eyeOff: EyeOff,
  download: Download,
  exportPdf: FileText,
  refresh: RefreshCw,
  imageFile: ImageIcon,
  mindMap: Network,
  ownerDashboard: LayoutDashboard,
  moneyProtection: ShieldAlert,
  cashIn: ArrowDownCircle,
  cashOut: ArrowUpCircle,
  trackOrder: Truck,
  truck: Truck,
  bill: FileSpreadsheet,
  supplier: Truck,
  trending: TrendingUp,
  comboChart: PieChart,
  backArrow: ArrowLeft,
  profile: User,
  customerTraining: GraduationCap,
  willGet: ArrowDownToLine,
  willGive: ArrowUpFromLine,
  money: Banknote,
  order: ShoppingBag,
  favorite: Heart,
  note: StickyNote,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof icons;

// Local alias: lucide doesn't export ArrowLeftRightSafe — use ArrowDownToLine fallback wouldn't fit semantics.
// So we re-import the proper one here.
import { ArrowLeftRight as ArrowLeftRightSafe } from "lucide-react";

export function AppIcon({
  name,
  className,
  ...rest
}: { name: IconKey } & ComponentProps<LucideIcon>) {
  const I = icons[name];
  return <I className={className} {...rest} />;
}