type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir: string;
  ios?: Record<string, unknown>;
  plugins?: Record<string, unknown>;
};

const config: CapacitorConfig = {
  appId: "app.daywave",
  appName: "Daywave",

  // Next.js static-export directory — populated by `npm run build`
  webDir: "out",

  ios: {
    // "never" = no native safe-area inset applied by iOS. All safe-area
    // positioning is handled entirely by CSS env(safe-area-inset-*) vars,
    // preventing the double-inset bug (native + CSS = 2x padding on iOS).
    contentInset: "never",

    // Disable native scroll bounce — the app manages its own scroll containers.
    scrollEnabled: false,

    // Only allow Safari remote debugging in dev builds — must be false for App Store.
    webContentsDebuggingEnabled: process.env.NODE_ENV !== "production",

    // White background matches the nav bar and page headers — no dark bleed.
    backgroundColor: "#ffffff",

    preferredContentMode: "mobile",
  },

  plugins: {
    SplashScreen: {
      // Duration the splash stays visible after the web content is ready (ms).
      launchShowDuration: 800,
      launchAutoHide: true,

      // Daywave brand navy — matches theme_color in the web manifest.
      backgroundColor: "#061832",

      showSpinner: false,

      // Cover the entire screen including the home indicator area.
      splashFullScreen: true,
      splashImmersive: true,
    },

    StatusBar: {
      // "Dark" = dark icons/text — correct on the white header background.
      style: "Dark",
      backgroundColor: "#ffffff",
    },

    // Keyboard behaviour — avoid the web view resizing when the keyboard appears
    // (the fixed BottomNav already accounts for safe-area padding).
    Keyboard: {
      resize: "none",
    },

    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
