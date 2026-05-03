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
import activeWarranty from "@/assets/icons/active-warranty.png";
import pendingOrder from "@/assets/icons/pending-order.png";
import customer from "@/assets/icons/customer.png";
import employee from "@/assets/icons/employee.png";
import alert from "@/assets/icons/alert.png";
import cash from "@/assets/icons/cash.png";
import cashRegister from "@/assets/icons/cash-register.png";
import transaction from "@/assets/icons/transaction.png";
import wishlist from "@/assets/icons/wishlist.png";
import notification from "@/assets/icons/notification.png";
import language from "@/assets/icons/language.png";
import settings from "@/assets/icons/settings.png";
import search from "@/assets/icons/search.png";
import add from "@/assets/icons/add.png";
import addUser from "@/assets/icons/add-user-male.png";
import addImage from "@/assets/icons/add-image.png";
import edit from "@/assets/icons/edit-pencil.png";
import del from "@/assets/icons/delete.png";
import eye from "@/assets/icons/eye.png";
import eyeOff from "@/assets/icons/invisible.png";
import download from "@/assets/icons/download.png";
import exportPdf from "@/assets/icons/export-pdf.png";
import refresh from "@/assets/icons/refresh.png";
import imageFile from "@/assets/icons/image-file.png";
import mindMap from "@/assets/icons/mind-map.png";
import ownerDashboard from "@/assets/icons/owner-dashboard.png";

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
  activeWarranty,
  pendingOrder,
  customer,
  employee,
  alert,
  cash,
  cashRegister,
  transaction,
  wishlist,
  notification,
  language,
  settings,
  search,
  add,
  addUser,
  addImage,
  edit,
  delete: del,
  eye,
  eyeOff,
  download,
  exportPdf,
  refresh,
  imageFile,
  mindMap,
  ownerDashboard,
} as const;

export type IconKey = keyof typeof icons;