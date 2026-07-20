# Unbinge — Distraction-Free YouTube for Focus & Learning

Unbinge is a Chrome extension that transforms YouTube into a calm, focused, whitelist-only learning environment. Instead of fighting YouTube's recommendation algorithm, Unbinge removes the distractions entirely and only shows videos from channels you (or a parent/teacher) have explicitly approved.

**Install from the Chrome Web Store:**  
https://chromewebstore.google.com/detail/mcpapcjehehgkabkeimooegacbjgfcnk

---

## ✨ Features

- **Whitelist-only YouTube** — only approved channels are visible; everything else is hidden at the page level (no thumbnails, titles, or previews).
- **Comprehensive distraction blocking** — hides Shorts, recommended sidebar, home feed, trending, comments, end-screen suggestions, autoplay, live chat, and promotional elements (merch, tickets, fundraisers).
- **Three profiles** — Kids (≤8), Teens (9-14), and Adult/Parent — each applying a sensible baseline of filters that users can fine-tune.
- **Granular distraction settings** — individual toggles for each distraction type, with a master switch and reset-to-defaults.
- **Channel-request & approval workflow** — add channels locally for instant access and submit them for global review.
- **Whitelist synchronization** — manual sync plus automatic weekly background sync.
- **Light & dark mode** — respects system preference, toggleable from the popup.
- **Privacy-first** — all settings and approvals are stored locally; no personal data is collected or transmitted.

---

## 🚀 Install from the Chrome Web Store

1. Visit the [Unbinge listing](https://chromewebstore.google.com/detail/mcpapcjehehgkabkeimooegacbjgfcnk).
2. Click **Add to Chrome**.
3. Confirm the permissions prompt.
4. The onboarding page opens automatically — pick your profile and you're ready.

---

## 🧱 Tech Stack

- **Chrome Extension** — Manifest V3, TypeScript, Vite
- **Content scripts** — inject `unhook.css` at `document_start` to hide elements before they render
- **Background** — service worker with `chrome.alarms`, `chrome.webNavigation`, `chrome.storage`, and `chrome.runtime` messaging
- **Backend** — PHP/MySQL on Hostinger (channel requests, whitelist sync, feedback, admin moderation)
- **Website** — `unbinge.watch` (privacy policy, terms, FAQ, contact, install guide)

---

## 📌 Roadmap

- [x] Publish on Chrome Web Store
- [ ] Add support for Edge and Firefox
- [ ] Proxy YouTube Data API calls through the PHP backend (remove key from client bundle)
- [ ] Expand the community-curated whitelist
- [ ] Continuous improvements based on user feedback

---

## 📄 License

This project is licensed under the MIT License.
