#!/usr/bin/env bash
# Run this on macOS after `npx cap add ios` to verify every required iOS project
# setting is correct before archive or App Store submission.
#
# Usage:
#   chmod +x scripts/audit-ios-settings.sh
#   ./scripts/audit-ios-settings.sh           # audit only (print PASS/FAIL)
#   ./scripts/audit-ios-settings.sh --fix     # audit + auto-apply safe fixes

set -euo pipefail

FIX_MODE=false
[[ "${1:-}" == "--fix" ]] && FIX_MODE=true

PASS=0
FAIL=0
WARN=0

# ─── helpers ────────────────────────────────────────────────────────────────

pass()  { echo "  ✅  $*"; PASS=$((PASS+1)); }
fail()  { echo "  ❌  $*"; FAIL=$((FAIL+1)); }
warn()  { echo "  ⚠️   $*"; WARN=$((WARN+1)); }
info()  { echo "  ℹ️   $*"; }
header(){ echo; echo "── $* ──"; }

plist_get() {
  /usr/libexec/PlistBuddy -c "Print :$1" "$2" 2>/dev/null || echo "__MISSING__"
}

plist_set() {
  local key="$1" type="$2" value="$3" file="$4"
  /usr/libexec/PlistBuddy -c "Set :$key $value" "$file" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :$key $type $value" "$file"
}

# ─── paths ──────────────────────────────────────────────────────────────────

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$REPO_ROOT/ios"
APP_DIR="$IOS_DIR/App"
PBXPROJ="$APP_DIR/App.xcodeproj/project.pbxproj"
INFO_PLIST="$APP_DIR/App/Info.plist"
CAP_CONFIG="$REPO_ROOT/capacitor.config.ts"

echo
echo "╔══════════════════════════════════════════════╗"
echo "║     Daywave iOS Project Settings Audit       ║"
echo "╚══════════════════════════════════════════════╝"

# ─── 0. Prerequisites ────────────────────────────────────────────────────────

header "0. Prerequisites"

if [[ ! -d "$IOS_DIR" ]]; then
  fail "ios/ directory not found — run \`npm run cap:add:ios\` first, then re-run this script"
  echo
  echo "Total: FAIL (prerequisites not met)"
  exit 1
fi
pass "ios/ directory exists"

if [[ ! -f "$PBXPROJ" ]]; then
  fail "Xcode project not found at $PBXPROJ"
  exit 1
fi
pass "Xcode project (.pbxproj) found"

if [[ ! -f "$INFO_PLIST" ]]; then
  fail "Info.plist not found at $INFO_PLIST"
  exit 1
fi
pass "Info.plist found"

# ─── 1. Bundle Identifier ────────────────────────────────────────────────────

header "1. Bundle Identifier"

EXPECTED_BUNDLE="app.daywave"
ACTUAL_BUNDLE=$(grep -o 'PRODUCT_BUNDLE_IDENTIFIER = [^;]*' "$PBXPROJ" | head -1 | awk '{print $3}' | tr -d ';' || echo "")

if [[ "$ACTUAL_BUNDLE" == "$EXPECTED_BUNDLE" ]]; then
  pass "Bundle identifier: $ACTUAL_BUNDLE"
else
  fail "Bundle identifier is '$ACTUAL_BUNDLE', expected '$EXPECTED_BUNDLE'"
  if $FIX_MODE; then
    sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER = [^;]*/PRODUCT_BUNDLE_IDENTIFIER = $EXPECTED_BUNDLE/g" "$PBXPROJ"
    info "Fixed bundle identifier to $EXPECTED_BUNDLE"
  else
    info "Run with --fix to auto-correct, or set manually in Xcode → Target → Signing & Capabilities"
  fi
fi

# ─── 2. Display Name ─────────────────────────────────────────────────────────

header "2. Display Name"

EXPECTED_NAME="Daywave"
ACTUAL_NAME=$(plist_get "CFBundleDisplayName" "$INFO_PLIST")

if [[ "$ACTUAL_NAME" == "$EXPECTED_NAME" ]]; then
  pass "Display name: $ACTUAL_NAME"
elif [[ "$ACTUAL_NAME" == "__MISSING__" ]]; then
  warn "CFBundleDisplayName not set in Info.plist (Capacitor default may use CFBundleName)"
  CFBundleName=$(plist_get "CFBundleName" "$INFO_PLIST")
  info "CFBundleName = $CFBundleName"
  if $FIX_MODE; then
    plist_set "CFBundleDisplayName" string "$EXPECTED_NAME" "$INFO_PLIST"
    info "Added CFBundleDisplayName = $EXPECTED_NAME"
  fi
else
  fail "Display name is '$ACTUAL_NAME', expected '$EXPECTED_NAME'"
  if $FIX_MODE; then
    plist_set "CFBundleDisplayName" string "$EXPECTED_NAME" "$INFO_PLIST"
    info "Fixed display name to $EXPECTED_NAME"
  fi
fi

# ─── 3. Deployment Target ────────────────────────────────────────────────────

header "3. Deployment Target"

EXPECTED_TARGET="16.0"
ACTUAL_TARGET=$(grep -o 'IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*' "$PBXPROJ" | head -1 | awk '{print $3}' || echo "")

if [[ "$ACTUAL_TARGET" == "$EXPECTED_TARGET" ]]; then
  pass "Deployment target: iOS $ACTUAL_TARGET"
elif [[ -z "$ACTUAL_TARGET" ]]; then
  warn "Could not read deployment target from project — verify manually in Xcode (expected iOS $EXPECTED_TARGET)"
else
  MAJOR=$(echo "$ACTUAL_TARGET" | cut -d. -f1)
  if [[ "$MAJOR" -ge 16 ]]; then
    pass "Deployment target iOS $ACTUAL_TARGET meets minimum (≥ 16.0)"
  else
    fail "Deployment target iOS $ACTUAL_TARGET is below minimum iOS $EXPECTED_TARGET"
    if $FIX_MODE; then
      sed -i '' "s/IPHONEOS_DEPLOYMENT_TARGET = $ACTUAL_TARGET/IPHONEOS_DEPLOYMENT_TARGET = $EXPECTED_TARGET/g" "$PBXPROJ"
      info "Fixed deployment target to iOS $EXPECTED_TARGET"
    fi
  fi
fi

# ─── 4. Supported Orientations ───────────────────────────────────────────────

header "4. Supported Orientations (Portrait-only)"

ORIENTATIONS=$(plist_get "UISupportedInterfaceOrientations" "$INFO_PLIST")
LANDSCAPE_ALLOWED=false

if echo "$ORIENTATIONS" | grep -q "Landscape"; then
  LANDSCAPE_ALLOWED=true
fi

if $LANDSCAPE_ALLOWED; then
  fail "Landscape orientations detected — Daywave is portrait-only"
  info "In Xcode: Target → General → Deployment Info — uncheck Landscape Left / Landscape Right"
else
  pass "Only portrait orientations declared"
fi

IPAD_ORIENTATIONS=$(plist_get "UISupportedInterfaceOrientations~ipad" "$INFO_PLIST")
if [[ "$IPAD_ORIENTATIONS" != "__MISSING__" ]]; then
  info "iPad orientations also set: $IPAD_ORIENTATIONS (acceptable — app is iPhone-only)"
fi

# ─── 5. Status Bar Style ─────────────────────────────────────────────────────

header "5. Status Bar"

STATUS_STYLE=$(plist_get "UIStatusBarStyle" "$INFO_PLIST")
VIEW_CONTROLLER=$(plist_get "UIViewControllerBasedStatusBarAppearance" "$INFO_PLIST")

if [[ "$STATUS_STYLE" == "UIStatusBarStyleLightContent" ]]; then
  pass "Status bar style: UIStatusBarStyleLightContent (white text on navy)"
else
  warn "Status bar style is '$STATUS_STYLE' (expected UIStatusBarStyleLightContent)"
  if $FIX_MODE; then
    plist_set "UIStatusBarStyle" string "UIStatusBarStyleLightContent" "$INFO_PLIST"
    info "Fixed UIStatusBarStyle"
  fi
fi

if [[ "$VIEW_CONTROLLER" == "false" ]]; then
  pass "UIViewControllerBasedStatusBarAppearance: false (global style applies)"
else
  warn "UIViewControllerBasedStatusBarAppearance should be false for a consistent status bar style"
  if $FIX_MODE; then
    plist_set "UIViewControllerBasedStatusBarAppearance" bool "false" "$INFO_PLIST"
    info "Fixed UIViewControllerBasedStatusBarAppearance"
  fi
fi

# ─── 6. App Icons ────────────────────────────────────────────────────────────

header "6. App Icons"

ICON_SET="$APP_DIR/App/Assets.xcassets/AppIcon.appiconset"

if [[ ! -d "$ICON_SET" ]]; then
  fail "AppIcon.appiconset not found at $ICON_SET"
  info "Copy pre-generated icons from public/brand/ or generate with makeappicon.com"
else
  pass "AppIcon.appiconset directory exists"

  # Check for the mandatory 1024x1024 App Store icon
  CONTENTS_JSON="$ICON_SET/Contents.json"
  if [[ -f "$CONTENTS_JSON" ]]; then
    if grep -q '"1024x1024"' "$CONTENTS_JSON"; then
      pass "1024×1024 App Store icon declared in Contents.json"
    else
      fail "1024×1024 App Store icon NOT declared — required for App Store submission"
    fi
  else
    warn "Contents.json not found in AppIcon.appiconset"
  fi

  # Count actual image files
  ICON_COUNT=$(find "$ICON_SET" -name "*.png" | wc -l | tr -d ' ')
  if [[ "$ICON_COUNT" -ge 1 ]]; then
    pass "$ICON_COUNT PNG icon file(s) present"
  else
    fail "No PNG icons found in AppIcon.appiconset"
    info "Run: cp public/brand/icon-1024.png $ICON_SET/ and update Contents.json"
  fi
fi

# ─── 7. Splash Assets ────────────────────────────────────────────────────────

header "7. Splash / Launch Screen"

SPLASH_STORYBOARD="$APP_DIR/App/Base.lproj/LaunchScreen.storyboard"
if [[ -f "$SPLASH_STORYBOARD" ]]; then
  pass "LaunchScreen.storyboard present"
  if grep -q "061832\|#061832\|navy\|backgroundColor" "$SPLASH_STORYBOARD" 2>/dev/null; then
    pass "Splash references navy background color"
  else
    warn "LaunchScreen.storyboard may not have the Daywave navy (#061832) background — verify in Xcode"
  fi
else
  warn "LaunchScreen.storyboard not found at expected path (Capacitor may use a different structure)"
fi

# Capacitor SplashScreen plugin config cross-check
if grep -q '"#061832"' "$REPO_ROOT/capacitor.config.ts"; then
  pass "capacitor.config.ts SplashScreen backgroundColor = #061832"
else
  warn "capacitor.config.ts SplashScreen backgroundColor does not contain #061832 — check for brand navy"
fi

# ─── 8. Signing Placeholders ─────────────────────────────────────────────────

header "8. Code Signing"

DEV_TEAM=$(grep -o 'DEVELOPMENT_TEAM = [^;]*' "$PBXPROJ" | head -1 | awk '{print $3}' | tr -d ';' || echo "")
CODE_SIGN_STYLE=$(grep -o 'CODE_SIGN_STYLE = [^;]*' "$PBXPROJ" | head -1 | awk '{print $3}' | tr -d ';' || echo "")

if [[ -z "$DEV_TEAM" || "$DEV_TEAM" == '""' ]]; then
  warn "DEVELOPMENT_TEAM not set — you must set your Apple Developer Team ID in Xcode before archiving"
  info "Xcode → Project Navigator → App → Signing & Capabilities → Team"
else
  pass "Development team set: $DEV_TEAM"
fi

if [[ "$CODE_SIGN_STYLE" == "Automatic" ]]; then
  pass "CODE_SIGN_STYLE = Automatic (Xcode-managed signing)"
else
  info "CODE_SIGN_STYLE = $CODE_SIGN_STYLE"
fi

# ─── 9. Debug Flags ──────────────────────────────────────────────────────────

header "9. Production Safety Flags"

if grep -q 'webContentsDebuggingEnabled.*true' "$REPO_ROOT/capacitor.config.ts"; then
  fail "webContentsDebuggingEnabled is still true in capacitor.config.ts — MUST be false before App Store submission"
  if $FIX_MODE; then
    sed -i '' 's/webContentsDebuggingEnabled: true/webContentsDebuggingEnabled: false/' "$REPO_ROOT/capacitor.config.ts"
    info "Fixed: set webContentsDebuggingEnabled to false"
  fi
else
  pass "webContentsDebuggingEnabled is false (or absent)"
fi

# ─── 10. Privacy Strings in Info.plist ───────────────────────────────────────

header "10. Info.plist Privacy Strings"

PHOTO_USAGE=$(plist_get "NSPhotoLibraryUsageDescription" "$INFO_PLIST")
CAMERA_USAGE=$(plist_get "NSCameraUsageDescription" "$INFO_PLIST")

if [[ "$PHOTO_USAGE" == "__MISSING__" ]]; then
  fail "NSPhotoLibraryUsageDescription missing — required because the group chat photo picker accesses the photo library"
  if $FIX_MODE; then
    plist_set "NSPhotoLibraryUsageDescription" string \
      "Daywave uses your photo library to share trip memories in the group chat." "$INFO_PLIST"
    info "Added NSPhotoLibraryUsageDescription"
  fi
else
  pass "NSPhotoLibraryUsageDescription present"
fi

if [[ "$CAMERA_USAGE" == "__MISSING__" ]]; then
  warn "NSCameraUsageDescription missing — add if camera capture is enabled; omit if only library picker is used"
  if $FIX_MODE; then
    plist_set "NSCameraUsageDescription" string \
      "Daywave uses your camera to capture and share trip photos." "$INFO_PLIST"
    info "Added NSCameraUsageDescription"
  fi
else
  pass "NSCameraUsageDescription present"
fi

for UNUSED_KEY in NSLocationWhenInUseUsageDescription NSContactsUsageDescription NSMicrophoneUsageDescription; do
  VAL=$(plist_get "$UNUSED_KEY" "$INFO_PLIST")
  if [[ "$VAL" != "__MISSING__" ]]; then
    warn "$UNUSED_KEY is declared but the app may not use this capability — remove if unused to avoid rejection"
  fi
done

# ─── Summary ─────────────────────────────────────────────────────────────────

echo
echo "══════════════════════════════════════"
echo "  Audit complete"
echo "  ✅  $PASS passed"
echo "  ⚠️   $WARN warnings"
echo "  ❌  $FAIL failures"
echo "══════════════════════════════════════"
echo

if [[ $FAIL -gt 0 ]]; then
  echo "Action required: fix all ❌ items before submitting to App Store."
  echo "Re-run with --fix to auto-correct safe settings:"
  echo "  ./scripts/audit-ios-settings.sh --fix"
  exit 1
elif [[ $WARN -gt 0 ]]; then
  echo "Review ⚠️  warnings above. Most are non-blocking but should be verified."
  exit 0
else
  echo "All checks passed. Ready to archive."
  exit 0
fi
