/**
 * Apple WeatherKit attribution.
 *
 * REQUIRED by Apple's WeatherKit terms wherever weather data is displayed:
 * an "Apple Weather" link to weather.apple.com plus a link to the legal page
 * listing the other data sources. Render this on any view that shows WeatherKit
 * data. We avoid the  glyph because this ships to Android via Capacitor, where
 * that character won't render.
 */
export function WeatherAttribution({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-1.5 text-[11px] text-gray-400 ${className}`}
    >
      <a
        href="https://weather.apple.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-gray-500 transition-colors"
      >
        Apple Weather
      </a>
      <span aria-hidden="true">·</span>
      <a
        href="https://weatherkit.apple.com/legal-attribution.html"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-gray-500 transition-colors"
      >
        Other data sources
      </a>
    </div>
  );
}
