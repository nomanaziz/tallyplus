// Hishabee-style illustrated icons. Imported as URL strings — used in <img> tags.
import home from "@/assets/icons/home.svg";
import sell from "@/assets/icons/sell.svg";
import purchase from "@/assets/icons/purchase.svg";
import quickSell from "@/assets/icons/quick-sell.svg";
import cashbox from "@/assets/icons/cashbox.png";
import productList from "@/assets/icons/product-list.svg";
import stock from "@/assets/icons/stock.svg";
import contact from "@/assets/icons/contact.svg";
import salesList from "@/assets/icons/sales-list.svg";
import purchaseList from "@/assets/icons/purchase-list.svg";
import due from "@/assets/icons/due.svg";
import expense from "@/assets/icons/expense.svg";
import expired from "@/assets/icons/expired.png";
import warranty from "@/assets/icons/warranty.png";
import recycle from "@/assets/icons/recycle-bin.png";
import access from "@/assets/icons/access.svg";
import printer from "@/assets/icons/printer.svg";
import businessReport from "@/assets/icons/business-report.svg";
import marketing from "@/assets/icons/marketing.svg";
import onlineShop from "@/assets/icons/online-shop.svg";
import training from "@/assets/icons/training.svg";
import buySubscription from "@/assets/icons/buy-subscription.png";
import brandHishabee from "@/assets/icons/brand-hishabee.svg";
import brandBee from "@/assets/icons/brand-bee.svg";
import bookmark from "@/assets/icons/bookmark.svg";

export const icons = {
  home,
  sell,
  purchase,
  quickSell,
  cashbox,
  productList,
  stock,
  contact,
  salesList,
  purchaseList,
  due,
  expense,
  expired,
  warranty,
  recycle,
  access,
  printer,
  businessReport,
  marketing,
  onlineShop,
  training,
  buySubscription,
  brandHishabee,
  brandBee,
  bookmark,
} as const;

export type IconKey = keyof typeof icons;