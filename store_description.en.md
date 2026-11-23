# Store Description (Chrome Web Store) - English

Copy and paste the plain-text body under each field heading directly into the Chrome Web Store Developer Dashboard.

### **Name**
EnvIcon - Environment Identifier & Favicon Badge

### **Short Description**
Visually distinguish Production, Staging, and Development environments with dynamic favicon, in-page, and toolbar badges.

### **Detailed Description**
💡 [ OVERVIEW ]
EnvIcon is a Chrome extension built for developers, QA engineers, and system operators who work across multiple environments (such as Production, Staging, and Development) simultaneously.
Based on your configured URL patterns - including hostnames, port numbers, URL paths, and regular expressions - EnvIcon dynamically applies favicon overlays, floating in-page badges, toolbar icon indicators, and DevTools console logs to help prevent accidental actions in the wrong environment.

🛠️ [ CORE FEATURES ]
* Four Visual Environment Indicators
- Dynamic Favicon Badge: Overlays an environment label (up to 4 characters, such as PROD or STG) onto the page's favicon so you can identify environments at a glance across many open tabs.
- In-Page Floating Badge: Displays a semi-transparent badge fixed to any corner of the viewport. Uses click-through styling so it never blocks page clicks or text selection.
- Dynamic Toolbar Icon: Updates the extension toolbar icon in real time to reflect the matched environment or paused state.
- DevTools Console Output: Prints the active environment name in color within the browser console for quick verification during debugging.

* Quick Action Popup & Temporary Pause
- One-Click Assignment: Assign or remove the current site (hostname or hostname:port) to any environment directly from the toolbar popup without opening the options page.
- Temporary Pause (Per-Site or Global): Pause indicators for the current site or across all sites with a single toggle. The original favicon and page state are restored immediately without reloading, and indicators automatically resume when the browser restarts so you do not forget to turn them back on.

* Flexible Customization
- Includes Production, Staging, and Development presets out of the box, plus support for unlimited custom environments (such as QA, UAT, or Local).
- Configure indicator toggles, badge text (up to 4 characters), fill color, outline color, badge corner position, and font size independently for each environment.
- Each environment card organizes URL Patterns and Badge & Display settings into separate tabs with a live mini-badge preview and rule count in the header.

✨ [ DISTINGUISHING FEATURES ]
* Port, URL Path, and Regex Matching with Specificity Priority
- Match rules by hostname, port number (e.g., distinguishing localhost:3000 from localhost:8080), URL path prefix on segment boundaries (e.g., example.com/stg), or regular expressions (Regex).
- When multiple rules match the same URL, specificity-based priority automatically selects the most specific rule (deeper URL path > port-specific rule > hostname-only rule; exact pattern > regex) regardless of environment order.

* Real-Time SPA Navigation & Dynamic Favicon Support
- Tracks client-side URL changes in Single Page Applications (pushState / popstate) as well as dynamic favicon updates by the host site, applying or restoring badges immediately without a page reload.

* Accidental Edit Protection in Popup
- When a page matches via a URL path rule, regular expression, or broad parent hostname rule, the popup locks one-click overwriting and guides you to the options page to prevent unintended changes to shared rules.

📌 [ HOW TO USE ]
* Quick Setup from the Toolbar Popup
1. Open the target web page and click the EnvIcon icon in the browser toolbar.
2. Select an environment from the list to apply the badge immediately.

* Detailed Configuration in the Options Page
1. Click the gear icon in the popup (or open Extension Options) to launch the settings page.
2. Edit an existing environment or click "Add Environment" to create a custom one.
3. Under the "URL Patterns" tab, enter target patterns (e.g., localhost:3000, stg.example.com, example.com/admin), and adjust badge colors, text, and position under the "Badge & Display" tab. Valid changes are saved automatically and applied to open tabs in real time.

⚙️ [ DEVELOPER & POWER-USER FEATURES ]
* Built-In URL Checker
- Test any URL directly in the options page to preview the resulting environment badge and automatically switch to and highlight the exact winning pattern row based on priority rules.

* Auto-Save with Validation Reason Popover
- All configuration edits are validated and auto-saved. If an invalid format or duplicate pattern is detected across environments, hovering over (or focusing) the footer status indicator displays a grouped list of specific validation reasons.

* Pattern Controls & Team Sharing (JSON Import / Export)
- Toggle individual URL patterns on or off without deleting them, and reorder pattern priority via drag-and-drop. Export and import full environment configurations as JSON files for backups or team sharing.

* Multilingual UI, Light / Dark Theme, and Browser Sync
- Automatically detects your browser language with manual switching across 5 languages (English, Japanese, Simplified Chinese, Traditional Chinese, and Korean).
- Supports Light and Dark themes, an interactive onboarding tour, and automatic cross-device synchronization via browser sync storage.
