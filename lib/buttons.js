/**
 * GLITCH PHANTOMZ MD BOT — Interactive Button Helper
 * ---------------------------------------------------------------
 * WhatsApp deprecated the old `buttonsMessage` / `templateMessage`
 * payloads a while back — they still send, but most WhatsApp and
 * WhatsApp Business clients just show the caption text with no
 * buttons. The payload that WhatsApp itself still renders as real
 * tappable buttons (on phone, WA Business, and WhatsApp Web/Desktop)
 * is an `interactiveMessage` carrying a `nativeFlowMessage`, sent
 * with the `<biz><interactive native_flow></biz>` binary node
 * attached to the stanza. Plain @whiskeysockets/baileys does not
 * attach that node automatically, so this file builds the message
 * "by hand" and relays it with the node included.
 *
 * USAGE (from any plugin):
 *   const { sendButtons, sendListButtons } = require('../lib/buttons');
 *
 *   await sendButtons(conn, m.chat, {
 *       text: "Choose one:",
 *       footer: "GLITCH PHANTOMZ MD",
 *       buttons: [
 *           { id: ".song", text: "🎵 Song" },
 *           { id: ".video", text: "🎬 Video" },
 *           { type: "url", text: "🌐 Website", url: "https://example.com" }
 *       ],
 *       image: "https://example.com/banner.jpg", // optional
 *       quoted: mek
 *   });
 *
 *   await sendListButtons(conn, m.chat, {
 *       text: "Pick a category:",
 *       footer: "GLITCH PHANTOMZ MD",
 *       buttonText: "Open Menu",
 *       sections: [
 *           { title: "Downloads", rows: [
 *               { title: "Song", rowId: ".song", description: "Download audio" },
 *               { title: "Video", rowId: ".video", description: "Download video" }
 *           ]}
 *       ],
 *       quoted: mek
 *   });
 *
 * The tap comes back as a normal command hit — lib/msg.js already
 * decodes `interactiveResponseMessage` into `m.body`, so a plugin
 * with `pattern: "song"` (no dot needed in the pattern itself,
 * exactly like every other command here) fires normally when the
 * button with id ".song" is tapped.
 */

const {
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    proto,
} = require('@whiskeysockets/baileys');

// The binary node WhatsApp expects alongside an interactive/native-flow
// message so it actually gets rendered as buttons (works for both the
// consumer WhatsApp app and WhatsApp Business).
const bizNode = () => ({
    tag: 'biz',
    attrs: {},
    content: [
        {
            tag: 'interactive',
            attrs: { type: 'native_flow', v: '1' },
            content: [
                { tag: 'native_flow', attrs: { name: 'mixed', v: '9' } }
            ]
        }
    ]
});

function toNativeFlowButton(b) {
    switch (b.type) {
        case 'url':
            return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: b.text, url: b.url, merchant_url: b.url }) };
        case 'call':
            return { name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.phone }) };
        case 'copy':
            return { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.copy, copy_code: b.copy }) };
        default:
            // plain tappable reply button — comes back through m.body as b.id
            return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }) };
    }
}

async function buildHeader(sock, image, video) {
    if (image) {
        const media = await prepareWAMessageMedia(
            { image: typeof image === 'string' ? { url: image } : image },
            { upload: sock.waUploadToServer }
        );
        return proto.Message.InteractiveMessage.Header.create({ ...media, title: '', hasMediaAttachment: true });
    }
    if (video) {
        const media = await prepareWAMessageMedia(
            { video: typeof video === 'string' ? { url: video } : video },
            { upload: sock.waUploadToServer }
        );
        return proto.Message.InteractiveMessage.Header.create({ ...media, title: '', hasMediaAttachment: true });
    }
    return proto.Message.InteractiveMessage.Header.create({ title: '', hasMediaAttachment: false });
}

/**
 * Send quick-reply / CTA buttons.
 */
async function sendButtons(sock, jid, opts = {}) {
    const { text = '', footer = '', buttons = [], image, video, quoted, mentions } = opts;

    const header = await buildHeader(sock, image, video);
    const nativeFlowButtons = buttons.map(toNativeFlowButton);

    const interactiveMessage = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.create({ text }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
        header,
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons: nativeFlowButtons }),
        contextInfo: { mentionedJid: mentions || [] }
    });

    const waMessage = generateWAMessageFromContent(
        jid,
        { interactiveMessage },
        { quoted, userJid: sock.user.id }
    );

    await sock.relayMessage(jid, waMessage.message, {
        messageId: waMessage.key.id,
        additionalNodes: [bizNode()]
    });

    return waMessage;
}

/**
 * Send a list-style menu (single_select) — the "tap to view options" list.
 * `sections`: [{ title, rows: [{ title, rowId, description }] }]
 */
async function sendListButtons(sock, jid, opts = {}) {
    const { text = '', footer = '', buttonText = 'Menu', sections = [], image, quoted, mentions } = opts;

    const header = await buildHeader(sock, image);

    const listButton = {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
            title: buttonText,
            sections: sections.map(s => ({
                title: s.title,
                rows: s.rows.map(r => ({
                    header: r.header || '',
                    title: r.title,
                    description: r.description || '',
                    id: r.rowId
                }))
            }))
        })
    };

    const interactiveMessage = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.create({ text }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
        header,
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons: [listButton] }),
        contextInfo: { mentionedJid: mentions || [] }
    });

    const waMessage = generateWAMessageFromContent(
        jid,
        { interactiveMessage },
        { quoted, userJid: sock.user.id }
    );

    await sock.relayMessage(jid, waMessage.message, {
        messageId: waMessage.key.id,
        additionalNodes: [bizNode()]
    });

    return waMessage;
}

module.exports = { sendButtons, sendListButtons };
