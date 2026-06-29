const params = new URLSearchParams(location.search);
const url = params.get("url");
const reason = params.get("reason");
const profile = params.get("profile");
const title = document.getElementById("blocked-title");
const message = document.getElementById("blocked-message");
const target = document.getElementById("blocked-url");

if (title && message && profile === "adult") {
  title.textContent = "Education Mode blocked this page";
  message.textContent =
    "This page is not in your approved YouTube list. As an Adult/Parent profile, you can turn off Education Mode, approve the channel locally, or request global review from the extension popup.";
} else if (title && message) {
  title.textContent = "This YouTube page is not approved yet";
  message.textContent =
    "Safe YouTube only opens channels and videos approved for this age category. Ask a parent to approve this channel locally or request a global review from the extension popup.";
}

if (reason && message) {
  message.textContent = `${message.textContent} (${reason})`;
}

if (url && target) {
  target.textContent = url;
  target.setAttribute("href", url);
} else if (target) {
  target.hidden = true;
}
