export function haptic(type: "light" | "medium" | "success" | "error" = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  switch (type) {
    case "light":   navigator.vibrate(10); break;
    case "medium":  navigator.vibrate(25); break;
    case "success": navigator.vibrate([10, 40, 10]); break;
    case "error":   navigator.vibrate([30, 20, 30]); break;
  }
}
