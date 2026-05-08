import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

export type TourLang = "bn" | "en";

const STORAGE_KEY = "tour_completed_v1";

export function isTourCompleted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTourCompleted() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function resetTour() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function buildSteps(lang: TourLang): DriveStep[] {
  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  return [
    {
      popover: {
        title: t("স্বাগতম! 👋", "Welcome! 👋"),
        description: t(
          "চলুন ৫টি ছোট ধাপে আপনার অ্যাপটি কীভাবে ব্যবহার করবেন তা দেখাই।",
          "Let's walk through your app in 5 quick steps.",
        ),
      },
    },
    {
      element: '[data-tour="profile"]',
      popover: {
        title: t("১. প্রোফাইল আপডেট করুন", "1. Update your profile"),
        description: t(
          "প্রথমে আপনার নাম, ঠিকানা ও দোকানের তথ্য পূরণ করুন।",
          "Start by filling in your name, address and shop info.",
        ),
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="products"]',
      popover: {
        title: t("২. পণ্য যোগ করুন", "2. Add your products"),
        description: t(
          "আপনার দোকানের পণ্যগুলো এখানে স্টকে যোগ করুন।",
          "Add the items you sell to your stock here.",
        ),
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="purchase"]',
      popover: {
        title: t("৩. ক্রয় লিপিবদ্ধ করুন", "3. Record a purchase"),
        description: t(
          "সরবরাহকারীর কাছ থেকে কেনা পণ্য এখানে যোগ করুন।",
          "Record items you bought from a supplier.",
        ),
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="sell"]',
      popover: {
        title: t("৪. বিক্রয় শুরু করুন", "4. Make a sale"),
        description: t(
          "কাস্টমারের কাছে পণ্য বিক্রি করে invoice তৈরি করুন।",
          "Sell to customers and generate invoices.",
        ),
        side: "right",
        align: "start",
      },
    },
    {
      popover: {
        title: t("৫. শেষ! 🎉", "5. All done! 🎉"),
        description: t(
          "যেকোনো সময় Sidebar-এর নিচে \"টুর আবার দেখুন\" থেকে এই গাইড আবার চালু করতে পারবেন।",
          "You can replay this tour anytime from the \"Restart Tour\" button at the bottom of the sidebar.",
        ),
      },
    },
  ];
}

export function startTour(lang: TourLang) {
  const labels = lang === "bn"
    ? { next: "পরবর্তী →", prev: "← আগে", done: "সম্পন্ন", close: "এড়িয়ে যান" }
    : { next: "Next →", prev: "← Back", done: "Done", close: "Skip" };

  const d = driver({
    showProgress: true,
    allowClose: true,
    overlayOpacity: 0.6,
    nextBtnText: labels.next,
    prevBtnText: labels.prev,
    doneBtnText: labels.done,
    progressText: lang === "bn" ? "{{current}} / {{total}}" : "{{current}} of {{total}}",
    steps: buildSteps(lang),
    onDestroyed: () => {
      markTourCompleted();
    },
  });
  d.drive();
}