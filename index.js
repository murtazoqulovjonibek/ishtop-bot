require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require("express");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const { db } = require("./firebase");

const ADMIN_ID = 5869201380;

// EXPRESS
const app = express();
app.get("/", (req, res) => res.send("Bot ishlayapti 🚀"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));

// REGIONS
const regions = [
    "Toshkent", "Samarqand", "Buxoro", "Andijon",
    "Farg‘ona", "Namangan", "Qashqadaryo", "Surxondaryo"
];

// APPLY STATE
const userStates = {};

// 🔥 VIP STATE
const vipRequests = {};

// START
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "👋 IshTop ga xush kelibsiz!", {
        reply_markup: {
            keyboard: [
                ['👤 Ish izlayapman'],
                ['🏢 Ish beraman']
            ],
            resize_keyboard: true
        }
    });
});

// VIP COMMAND (UPDATED)
bot.onText(/\/vip/, (msg) => {
    bot.sendMessage(msg.chat.id, `
💎 VIP e'lon qilish

👉 Avval ish ID yuboring:

Masalan:
vip abc123

Narxi: 5 000 so'm
    `);
});

// ADMIN
bot.onText(/\/admin/, (msg) => {
    if (msg.from.id !== ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, "❌ Ruxsat yo‘q");
    }

    bot.sendMessage(msg.chat.id, `
🛠 Admin panel:

📋 Ishlarni ko‘rish → admin jobs
⭐ VIP qilish → vip ID
❌ Ishni o‘chirish → delete ID
    `);
});

// MESSAGE
bot.on('message', async (msg) => {
    const text = msg.text || "";

    // APPLY QABUL
    if (userStates[msg.chat.id]?.step === "apply") {
        const jobId = userStates[msg.chat.id].jobId;

        const doc = await db.collection("jobs").doc(jobId).get();
        if (!doc.exists) return;

        const job = doc.data();

        bot.sendMessage(job.ownerId, `
📩 Sizning e'loningizga ariza!

🆔 ID: ${jobId}

${job.text}

👤 Nomzod:
${text}
        `);

        bot.sendMessage(msg.chat.id, "✅ Arizangiz yuborildi!");
        delete userStates[msg.chat.id];
        return;
    }

    // 🔥 VIP REQUEST
    else if (text.startsWith('vip ')) {
        const id = text.split(' ')[1];

        vipRequests[msg.chat.id] = id;

        bot.sendMessage(msg.chat.id, `
💳 To‘lov qiling:

Click / Payme: 5614681916164076

📸 Chekni yuboring
        `);
    }

    // ISH IZLASH
    else if (text === '👤 Ish izlayapman') {
        return bot.sendMessage(msg.chat.id, "📍 Qayerdan ish izlayapsiz?", {
            reply_markup: {
                keyboard: [
                    ['Toshkent', 'Samarqand'],
                    ['Buxoro', 'Andijon'],
                    ['Farg‘ona', 'Namangan'],
                    ['Qashqadaryo', 'Surxondaryo'],
                    ['🔙 Orqaga']
                ],
                resize_keyboard: true
            }
        });
    }

    // REGION FILTER
    else if (regions.includes(text)) {
        const snapshot = await db.collection("jobs")
            .where("region", "==", text)
            .get();

        if (snapshot.empty) {
            return bot.sendMessage(msg.chat.id, "❌ Bu viloyatda ish topilmadi");
        }

        snapshot.forEach(doc => {
            const job = doc.data();

            let message = `🆔 ID: ${doc.id}

🧾 ${job.text}`;

            if (job.isPremium) {
                message = `🔥 VIP ISH\n\n${message}`;
            }

            bot.sendMessage(msg.chat.id, message, {
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: "📩 Ariza berish",
                            callback_data: doc.id
                        }]
                    ]
                }
            });
        });
    }

    // ORQAGA
    else if (text === '🔙 Orqaga') {
        bot.sendMessage(msg.chat.id, "👋 Asosiy menyu", {
            reply_markup: {
                keyboard: [
                    ['👤 Ish izlayapman'],
                    ['🏢 Ish beraman']
                ],
                resize_keyboard: true
            }
        });
    }

    // ISH BERISH
    else if (text === '🏢 Ish beraman') {
        bot.sendMessage(msg.chat.id, `
📝 Ish e'lon yuboring:

Quyidagi formatda yozing 👇

Lavozim: Ofitsiant
Maosh: 1 500 000 so'm
Manzil: Kogon shahar
Tel: +998901234567
Viloyat: Buxoro
        `);
    }

    // SAVE
    else if (text.includes('Lavozim:')) {
        let region = "Toshkent";

        regions.forEach(r => {
            if (text.includes(r)) {
                region = r;
            }
        });

        const docRef = await db.collection("jobs").add({
            text: text,
            region: region,
            ownerId: msg.from.id,
            createdAt: new Date(),
            isPremium: false
        });

        // 🔥 ISHNI KO‘RSATAMIZ
        bot.sendMessage(msg.chat.id, `
✅ Ish e'lon joylandi!

🆔 ID: ${docRef.id}

🧾 ${text}
        `, {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "💎 VIP qilish",
                            callback_data: "vip_" + docRef.id
                        }
                    ]
                ]
            }
        });
    }

    // ADMIN JOBS
    else if (text === 'admin jobs' && msg.from.id === ADMIN_ID) {
        const snapshot = await db.collection("jobs").get();

        snapshot.forEach(doc => {
            const job = doc.data();

            bot.sendMessage(msg.chat.id, `
ID: ${doc.id}

${job.text}
            `);
        });
    }

    // ADMIN VIP
    else if (text.startsWith('vip ') && msg.from.id === ADMIN_ID) {
        const id = text.split(' ')[1];

        await db.collection("jobs").doc(id).update({
            isPremium: true
        });

        bot.sendMessage(msg.chat.id, "🔥 VIP qilindi!");
    }

    // DELETE
    else if (text.startsWith('delete ') && msg.from.id === ADMIN_ID) {
        const id = text.split(' ')[1];

        await db.collection("jobs").doc(id).delete();

        bot.sendMessage(msg.chat.id, "❌ O‘chirildi!");
    }
});

// APPLY BUTTON
bot.on("callback_query", (query) => {
    const jobId = query.data;
    const chatId = query.message.chat.id;

    userStates[chatId] = {
        step: "apply",
        jobId: jobId
    };

    bot.sendMessage(chatId, `
📩 Ariza berish:

Ismingiz va telefon raqamingizni yuboring

Masalan:
Ali +998901234567
    `);
});

// 🔥 PAYMENT UPDATED
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const jobId = vipRequests[chatId];

    if (!jobId) {
        return bot.sendMessage(chatId, "❌ Avval vip tugmasini bosing");
    }

    const docRef = db.collection("jobs").doc(jobId);
    const doc = await docRef.get();

    if (!doc.exists) {
        return bot.sendMessage(chatId, "❌ Ish topilmadi");
    }

    const job = doc.data();

    // 🔥 AUTO VIP
    await docRef.update({
        isPremium: true
    });

    // ADMIN GA
    bot.sendMessage(ADMIN_ID, `
💰 VIP TO‘LOV!

👤 User: ${msg.from.id}
🆔 ID: ${jobId}

${job.text}
    `);

    bot.forwardMessage(ADMIN_ID, chatId, msg.message_id);

    bot.sendMessage(chatId, "🔥 VIP aktiv qilindi!");

    delete vipRequests[chatId];
});