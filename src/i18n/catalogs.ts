export interface CatalogEntry {
  readonly message: string;
  readonly placeholders?: readonly string[];
}

export type LocaleCatalog = Record<string, CatalogEntry>;

export const EN_CATALOG: LocaleCatalog = {
  ext_name: { message: 'Web Scrolling Screenshot' },
  ext_description: {
    message:
      'Capture full-page scrolling screenshots and custom regions at native High-DPI resolution. 100% private and local.',
  },
  popup_title: { message: 'Web Scrolling Screenshot' },
  popup_capture_full: { message: 'Capture Full Page' },
  popup_capture_full_hint: { message: 'Auto-scrolls and stitches at full screen resolution' },
  popup_capture_region: { message: 'Select Region' },
  popup_capture_region_hint: { message: 'Drag any area, including tall scrollable sections' },
  popup_status_selecting: { message: 'Select an area on the page (press Esc to cancel)…' },
  popup_status_ready: { message: 'Ready to capture' },
  popup_status_capturing: {
    message: 'Capturing page… $COMPLETED$ / $TOTAL$',
    placeholders: ['COMPLETED', 'TOTAL'],
  },
  popup_status_stitching: { message: 'Stitching High-DPI PNG…' },
  popup_status_done: { message: 'Preview opened — ready to download!' },
  popup_status_cancelled: { message: 'Capture cancelled' },
  popup_btn_cancel: { message: 'Cancel Capture' },
  popup_error_restricted_page: {
    message:
      'Browser system pages, extension stores, and built-in PDF viewers cannot be captured for security reasons.',
  },
  popup_error_generic: { message: 'Capture failed. Please refresh the page and try again.' },
  popup_format_label: { message: 'Default Format' },
  popup_quality_label: { message: 'Quality' },
  preview_title: { message: 'Screenshot Preview' },
  preview_empty_state: {
    message: 'No active capture loaded yet. Trigger a capture from the extension popup.',
  },
  preview_not_found: {
    message:
      'This capture has expired or was closed. Take a new screenshot from the extension popup.',
  },
  preview_loading: { message: 'Loading screenshot…' },
  preview_zoom_fit: { message: 'Fit' },
  preview_zoom_100: { message: '100%' },
  preview_zoom_in: { message: 'Zoom in' },
  preview_zoom_out: { message: 'Zoom out' },
  preview_parts_badge: { message: '$COUNT$ parts', placeholders: ['COUNT'] },
  preview_part_header: { message: 'Part $INDEX$ of $TOTAL$', placeholders: ['INDEX', 'TOTAL'] },
  preview_btn_download: { message: 'Download' },
  preview_btn_download_all: { message: 'Download All ($COUNT$)', placeholders: ['COUNT'] },
  preview_downloading: { message: 'Exporting…' },
  preview_download_complete: { message: 'Downloaded!' },
  preview_download_error: { message: 'Download failed. Please try again.' },
  overlay_hint_drag: { message: 'Drag to select an area' },
  overlay_hint_esc: { message: 'Esc to cancel' },
  overlay_btn_cancel: { message: 'Cancel' },
  cmd_capture_full: { message: 'Capture full page scrolling screenshot' },
  cmd_capture_region: { message: 'Select and capture custom page region' },
  popup_switch_lang_label: {
    message: 'Switch interface language between Arabic and English',
  },
};

export const AR_CATALOG: LocaleCatalog = {
  ext_name: { message: 'Web Scrolling Screenshot' },
  ext_description: {
    message:
      'التقاط لقطات شاشة للصفحة كاملة أو لأجزاء محددة بدقة High-DPI عالية جداً، وبخصوصية محلية 100%.',
  },
  popup_title: { message: 'تصوير صفحات الويب' },
  popup_capture_full: { message: 'التقاط الصفحة كاملة' },
  popup_capture_full_hint: { message: 'تمرير تلقائي ودمج بدقة الشاشة الأصلية الكاملة' },
  popup_capture_region: { message: 'تحديد مساحة للتصوير' },
  popup_capture_region_hint: { message: 'اسحب لتحديد أي جزء حتى لو كان أطول من الشاشة' },
  popup_status_selecting: { message: 'اسحب لتحديد مساحة على الصفحة (اضغط Esc للإلغاء)…' },
  popup_status_ready: { message: 'جاهز للالتقاط' },
  popup_status_capturing: {
    message: 'جارٍ التقاط الصفحة… $COMPLETED$ من $TOTAL$',
    placeholders: ['COMPLETED', 'TOTAL'],
  },
  popup_status_stitching: { message: 'جارٍ دمج الصورة عالية الدقة…' },
  popup_status_done: { message: 'تم فتح المعاينة — جاهز للتنزيل!' },
  popup_status_cancelled: { message: 'تم إلغاء الالتقاط' },
  popup_btn_cancel: { message: 'إلغاء الالتقاط' },
  popup_error_restricted_page: {
    message:
      'لا يمكن تصوير صفحات النظام الداخلية أو متاجر الإضافات أو عارض ملفات PDF لدواعي أمان المتصفح.',
  },
  popup_error_generic: { message: 'تعذّر إكمال الالتقاط. حدّث الصفحة وحاول مرة أخرى.' },
  popup_format_label: { message: 'الصيغة الافتراضية' },
  popup_quality_label: { message: 'الجودة' },
  preview_title: { message: 'معاينة لقطة الشاشة' },
  preview_empty_state: {
    message: 'لا توجد لقطة نشطة حالياً. ابدأ التصوير من أيقونة الإضافة.',
  },
  preview_not_found: {
    message: 'انتهت صلاحية هذه اللقطة المؤقتة أو أُغلقت. التقط لقطة جديدة من أيقونة الإضافة.',
  },
  preview_loading: { message: 'جارٍ تحميل اللقطة…' },
  preview_zoom_fit: { message: 'ملائمة' },
  preview_zoom_100: { message: '100%' },
  preview_zoom_in: { message: 'تكبير' },
  preview_zoom_out: { message: 'تصغير' },
  preview_parts_badge: { message: '$COUNT$ أجزاء', placeholders: ['COUNT'] },
  preview_part_header: { message: 'الجزء $INDEX$ من $TOTAL$', placeholders: ['INDEX', 'TOTAL'] },
  preview_btn_download: { message: 'تنزيل' },
  preview_btn_download_all: { message: 'تنزيل الكل ($COUNT$)', placeholders: ['COUNT'] },
  preview_downloading: { message: 'جارٍ التصدير…' },
  preview_download_complete: { message: 'تم التنزيل!' },
  preview_download_error: { message: 'تعذّر تنزيل الملف. حاول مرة أخرى.' },
  overlay_hint_drag: { message: 'اسحب بالماوس لتحديد المساحة' },
  overlay_hint_esc: { message: 'Esc للإلغاء' },
  overlay_btn_cancel: { message: 'إلغاء' },
  cmd_capture_full: { message: 'التقاط لقطة شاشة للصفحة كاملة بالتمرير' },
  cmd_capture_region: { message: 'تحديد مساحة مخصصة وتصويرها' },
  popup_switch_lang_label: {
    message: 'تبديل لغة الواجهة بين العربية والإنجليزية',
  },
};
