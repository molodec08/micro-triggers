export interface CartLine {
  [key: string]: unknown;
}

export interface Cart {
  item_count: number;
  total_price: number;
  currency: string;
  items?: CartLine[];
  [key: string]: unknown;
}

export interface StylingSettings {
  useThemeStyles: boolean;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  borderRadius: number;
  boxShadow: boolean;
  animation: "none" | "fade" | "slide" | string;
}

export interface ResolvedStyle {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  borderRadius: number;
  boxShadow: boolean;
  animation: string;
}

export interface BlinkingTabSettings {
  enabled: boolean;
  message: string;
  intervalMs: number;
}

export interface ExitPopupSettings {
  enabled: boolean;
  message: string;
  discountCode: string | null;
  sensitivityPx: number;
  countdownSeconds: number;
}

export interface SoundSettings {
  enabled: boolean;
  soundPreset: string;
  playOnAddCart: boolean;
  playOnCheckout: boolean;
}

export interface StickyCartBarSettings {
  enabled: boolean;
  message: string;
}

export interface LowStockBadgeSettings {
  enabled: boolean;
  threshold: number;
  message: string;
}

export interface FreeShippingBarSettings {
  enabled: boolean;
  thresholdCents: number;
  message: string;
  successMessage: string;
}

export interface EmailCaptureSettings {
  enabled: boolean;
  message: string;
}

export interface AllSettings {
  blinkingTab: BlinkingTabSettings;
  exitPopup: ExitPopupSettings;
  sound: SoundSettings;
  stickyCartBar: StickyCartBarSettings;
  lowStockBadge: LowStockBadgeSettings;
  freeShippingBar: FreeShippingBarSettings;
  emailCapture: EmailCaptureSettings;
  styling: StylingSettings;
}

export interface TriggerContext {
  leadUrl: string;
  styling: ResolvedStyle;
  originalTitle: string;
  onBlinkStop: (() => void) | null;
  registerBlinkStopHandler: (handler: () => void) => void;
}
