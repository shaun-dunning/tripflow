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
    // Render content behind the notch / Dynamic Island and home indicator.
    // Safe-area CSS env() variables compensate in the stylesheet.
    contentInset: "always",

    // Disable native scroll bounce — the app manages its own scroll containers.
    scrollEnabled: false,

    // Only allow Safari remote debugging in dev builds — must be false for App Store.
    webContentsDebuggingEnabled: process.env.NODE_ENV !== "production",

    // Match the Daywave brand navy used as the splash and status-bar background.
    backgroundColor: "#061832",

    // Use a liminal "dark" status bar so white text is legible on the navy splash.
    // Actual runtime control is handled by @capacitor/status-bar if installed.
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
      // "Dark" = light foreground text, correct on the navy background.
      style: "Dark",
      backgroundColor: "#061832",
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
