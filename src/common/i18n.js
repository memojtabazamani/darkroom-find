/**
 * Darkroom Find - Runtime Internationalization (i18n) Module
 * English & Farsi dictionary with zero external dependencies.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SpotlightI18n = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DICTIONARY = {
    en: {
      findBar: {
        placeholder: 'Find in page...',
        toggleCase: 'Match Case (Alt+C)',
        toggleWord: 'Match Whole Word (Alt+W)',
        toggleRegex: 'Regular Expression (Alt+R)',
        toggleMultiTerm: 'Multi-term Search (Alt+M)',
        prevMatch: 'Previous Match (Shift+Enter)',
        nextMatch: 'Next Match (Enter)',
        historyBtn: 'Search History',
        nativeFindBtn: 'Open Native Browser Find (Ctrl+F)',
        closeBtn: 'Close (Escape)',
        historyHeader: 'Recent Searches',
        historyEmpty: 'No recent searches',
        noMatches: 'No matches found',
        regexError: 'Regex Error',
        matchStatus: (current, total, capped) =>
          capped ? `Match ${current} of ${total}+` : `Match ${current} of ${total}`
      },
      options: {
        subtitle: 'In-Page Search',
        quickActivation: 'QUICK ACTIVATION',
        primarySearch: 'Primary Search',
        primarySearchHint: 'Press anywhere on any webpage',
        fallback: 'Fallback:',
        fallbackHint: 'Works even if page captures Ctrl+F',
        currentWebsite: 'Current Website',
        checkingSite: 'Checking site status...',
        siteActive: 'Darkroom Active on this site',
        siteDisabled: 'Darkroom Disabled on this site',
        enable: 'Enable',
        disable: 'Disable',
        livePreview: 'LIVE PREVIEW',
        previewMatch: 'matching phrases',
        previewCurrent: 'active match',
        previewTextBefore: 'Text on page dims into darkness while ',
        previewTextMid: ' illuminate with ',
        previewTextAfter: '.',
        dimIntensity: 'Darkroom Dim Intensity',
        dimHint: 'Controls how deeply the host webpage dims into darkness during search.',
        highlightColors: 'HIGHLIGHT COLORS',
        matchesLabel: 'Matches',
        activeMatchLabel: 'Active Match',
        maxMatchesCap: 'Max Matches Cap',
        maxMatchesHint: 'Caps rendering on massive pages to guarantee fluid 60fps scrolling.',
        excludedWebsites: 'EXCLUDED WEBSITES',
        excludedHint: 'Sites where Darkroom Find will not intercept Ctrl+F.',
        domainPlaceholder: 'example.com',
        addDomain: 'Add',
        noExcludedDomains: 'No excluded websites',
        removeExclusion: 'Remove exclusion',
        resetDefaults: 'Reset to Defaults',
        resetConfirm: 'Reset all settings to default values?',
        settingsSaved: 'Settings saved',
        langSwitchTitle: 'Switch Language / تغییر زبان'
      }
    },
    fa: {
      findBar: {
        placeholder: 'جستجو در صفحه...',
        toggleCase: 'تطابق بزرگی و کوچکی حروف (Alt+C)',
        toggleWord: 'تطابق کلمه کامل (Alt+W)',
        toggleRegex: 'عبارت منظم (Alt+R)',
        toggleMultiTerm: 'جستجوی چند عبارت (Alt+M)',
        prevMatch: 'مورد قبلی (Shift+Enter)',
        nextMatch: 'مورد بعدی (Enter)',
        historyBtn: 'تاریخچه جستجو',
        nativeFindBtn: 'جستجوی پیش‌فرض مرورگر (Ctrl+F)',
        closeBtn: 'بستن (Escape)',
        historyHeader: 'جستجوهای اخیر',
        historyEmpty: 'جستجوی اخیری وجود ندارد',
        noMatches: 'موردی یافت نشد',
        regexError: 'خطای Regex',
        matchStatus: (current, total, capped) =>
          capped ? `مورد ${current} از بیش از ${total}` : `مورد ${current} از ${total}`
      },
      options: {
        subtitle: 'جستجوی درون‌صفحه‌ای',
        quickActivation: 'فعال‌سازی سریع',
        primarySearch: 'جستجوی اصلی',
        primarySearchHint: 'در هر جای صفحه کلیدها را فشار دهید',
        fallback: 'جایگزین:',
        fallbackHint: 'حتی اگر صفحه کلید Ctrl+F را مهار کرده باشد کار می‌کند',
        currentWebsite: 'وب‌سایت فعلی',
        checkingSite: 'در حال بررسی وضعیت سایت...',
        siteActive: 'دارک‌روم در این سایت فعال است',
        siteDisabled: 'دارک‌روم در این سایت غیرفعال است',
        enable: 'فعال‌سازی',
        disable: 'غیرفعال‌سازی',
        livePreview: 'پیش‌نمایش زنده',
        previewMatch: 'عبارات منطبق',
        previewCurrent: 'مورد فعال',
        previewTextBefore: 'متن صفحه در تاریکی محو می‌شود در حالی که ',
        previewTextMid: ' با ',
        previewTextAfter: ' روشن می‌شوند.',
        dimIntensity: 'شدت تاریکی دارک‌روم',
        dimHint: 'میزان تاریک شدن صفحه هنگام جستجو را تنظیم می‌کند.',
        highlightColors: 'رنگ‌های هایلایت',
        matchesLabel: 'موارد منطبق',
        activeMatchLabel: 'مورد فعال',
        maxMatchesCap: 'حداکثر موارد منطبق',
        maxMatchesHint: 'محدود کردن رندر در صفحات بزرگ برای اسکرول روان ۶۰ فریم.',
        excludedWebsites: 'وب‌سایت‌های مستثنی',
        excludedHint: 'سایت‌هایی که دارک‌روم در آن‌ها کلید Ctrl+F را رهگیری نمی‌کند.',
        domainPlaceholder: 'example.com',
        addDomain: 'افزودن',
        noExcludedDomains: 'هیچ وب‌سایتی مستثنی نشده است',
        removeExclusion: 'حذف استثنا',
        resetDefaults: 'بازنشانی به پیش‌فرض',
        resetConfirm: 'آیا تمام تنظیمات به مقادیر پیش‌فرض بازگردانده شوند؟',
        settingsSaved: 'تنظیمات ذخیره شد',
        langSwitchTitle: 'تغییر زبان / Switch Language'
      }
    }
  };

  class SpotlightI18n {
    /**
     * Get direction for language ('rtl' or 'ltr')
     */
    static getDirection(lang) {
      return lang === 'fa' ? 'rtl' : 'ltr';
    }

    /**
     * Translate a key path, with English fallback
     * Example: t('findBar.placeholder', 'fa')
     */
    static t(path, lang = 'en', ...args) {
      const targetLang = (lang && DICTIONARY[lang]) ? lang : 'en';
      const keys = String(path).split('.');

      let val = DICTIONARY[targetLang];
      for (const k of keys) {
        if (val && typeof val === 'object' && k in val) {
          val = val[k];
        } else {
          val = undefined;
          break;
        }
      }

      // Fallback to English if missing in target language
      if (val === undefined && targetLang !== 'en') {
        let fallbackVal = DICTIONARY.en;
        for (const k of keys) {
          if (fallbackVal && typeof fallbackVal === 'object' && k in fallbackVal) {
            fallbackVal = fallbackVal[k];
          } else {
            fallbackVal = undefined;
            break;
          }
        }
        val = fallbackVal;
      }

      if (typeof val === 'function') {
        return val(...args);
      }

      return val !== undefined ? val : path;
    }
  }

  SpotlightI18n.DICTIONARY = DICTIONARY;
  return SpotlightI18n;
});
