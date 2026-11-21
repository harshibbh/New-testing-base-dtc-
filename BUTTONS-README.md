# GLITCH PHANTOMZ MD BOT — Button Update

## What changed
1. **Rebranded** — every hardcoded bot-name fallback (`DCT-MD-MINI-V6`, `HASHAN-MD`, `MR HASHUU`, etc.) now reads **GLITCH PHANTOMZ MD BOT** (`config.js → BOT_NAME`).
2. **`package.json`** — swapped the git-based Baileys install for the official, actively-maintained npm package: `@whiskeysockets/baileys` (`^6.7.17`), installed with a plain `npm install`.
3. **New file `lib/buttons.js`** — a helper that sends real, tappable interactive buttons (quick-reply, URL, call, copy) and list menus. It attaches the `<biz><interactive native_flow></biz>` node WhatsApp needs to actually render buttons — this is the part plain Baileys leaves out, and the reason old-style `buttons:`/`sections:` payloads (like the previous `TEST-BUTTON.js`) stopped showing on most phones. It's designed to render on **both** the normal WhatsApp app and WhatsApp Business.
4. **`lib/msg.js`** — every message now gets `m.replyButtons(text, buttons)` and `m.replyList(text, buttonText, sections)` shortcuts.
5. **`plugins/TEST-BUTTON.js`** — rewritten as two working demo commands: `.hashiya` (quick-reply buttons) and `.listmenu` (list menu).

## How to add buttons to ANY plugin
```js
const { sendButtons, sendListButtons } = require('../lib/buttons');

await sendButtons(conn, m.chat, {
    text: "Choose one:",
    footer: config.BOT_NAME,
    buttons: [
        { id: ".menu", text: "📜 Menu" },              // quick reply -> comes back as m.body
        { type: "url", text: "🌐 Website", url: "https://example.com" },
        { type: "call", text: "📞 Call us", phone: "94711234567" }
    ],
    image: "https://example.com/banner.jpg",           // optional
    quoted: mek
});
```
or, inside any command handler, simply:
```js
await m.replyButtons("Choose one:", [
    { id: ".menu", text: "📜 Menu" },
    { id: ".alive", text: "💓 Alive" }
]);
```
A tapped button fires the matching `pattern` command exactly like typing `.menu` would — nothing else to wire up.

## Honest heads-up
WhatsApp controls what actually renders on-device, and it changes this without notice on both the consumer app and WhatsApp Business. The `native_flow` + `biz` node approach used here is the current, most reliable method (it's what active bot projects use today), but no third-party library — including the official one — can *guarantee* 100% rendering forever. If buttons ever stop showing after a WhatsApp update, it usually means WhatsApp changed the binary node again and the `bizNode()` function in `lib/buttons.js` needs a small tweak. `.listmenu` / `.hashiya` are good quick tests after any WhatsApp app update.
