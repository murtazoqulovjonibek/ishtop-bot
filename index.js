require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require("express");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const { db } = require("./firebase");

const ADMIN_ID = 5869201380;

// 🌐 EXPRESS
const app = express();
app.get("/", (req, res) => res.send("Bot ishlayapti 🚀"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));

// 📍 REGION LIST
const regions = [
    "Toshkent", "Samarqand", "Buxoro", "Andijon",
    "Farg‘ona", "Namangan", "Qashqadaryo", "Surxondaryo"
];

// 🔥 APPLY STATE
const userStates = {};

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

// VIP
bot.onText(/\/vip/, (msg) => {
    bot.sendMessage(msg.chat.id, `
💎 VIP e'lon qilish

Narxi: 5 000 so'm

💳 To‘lov:
Click / Payme: 5614681916164076

📸 To‘lovdan keyin screenshot yuboring
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

    // 🔥 APPLY DATA QABUL
    if (userStates[msg.chat.id]?.step === "apply") {
        const jobId = userStates[msg.chat.id].jobId;

        try {
            const doc = await db.collection("jobs").doc(jobId).get();

            if (!doc.exists) {
                return bot.sendMessage(msg.chat.id, "❌ Ish topilmadi");
            }

            const job = doc.data();

            // ADMIN GA YUBORAMIZ
            bot.sendMessage(ADMIN_ID, `
📩 Yangi ariza!

👤 User ID: ${msg.from.id}

🧾 Ish:
${job.text}

📞 Ma’lumot:
${text}
            `);

            bot.sendMessage(msg.chat.id, "✅ Arizangiz yuborildi!");

            delete userStates[msg.chat.id];

        } catch (error) {
            console.log(error);
            bot.sendMessage(msg.chat.id, "❌ Xatolik");
        }

        return;
    }

    // 👤 ISH IZLASH
    if (text === '👤 Ish izlayapman') {
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
            return bot.sendMessage(msg.chat.id, "❌ Ish topilmadi");
        }

        snapshot.forEach(doc => {
            const job = doc.data();

            let message = `🧾 ${job.text}`;
            if (job.isPremium) message = `🔥 VIP ISH\n\n${message}`;

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

    // 🔙 ORQAGA
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

    // 🏢 ISH BERISH
    else if (text === '🏢 Ish beraman') {
        bot.sendMessage(msg.chat.id, `
📝 Ish e'lon yuboring:

Lavozim:
Maosh:
Manzil:
Tel:
Viloyat:
        `);
    }

    // 💾 SAVE
    else if (text.includes('Lavozim:')) {
        let region = "Toshkent";

        regions.forEach(r => {
            if (text.includes(r)) region = r;
        });

        await db.collection("jobs").add({
            text: text,
            region: region,
            createdAt: new Date(),
            isPremium: false
        });

        bot.sendMessage(msg.chat.id, "✅ Ish saqlandi!");
    }

    // ADMIN
    else if (text === 'admin jobs' && msg.from.id === ADMIN_ID) {
        const snapshot = await db.collection("jobs").get();

        snapshot.forEach(doc => {
            const job = doc.data();
            bot.sendMessage(msg.chat.id, `ID: ${doc.id}\n\n${job.text}`);
        });
    }

    else if (text.startsWith('vip ') && msg.from.id === ADMIN_ID) {
        const id = text.split(' ')[1];
        await db.collection("jobs").doc(id).update({ isPremium: true });
        bot.sendMessage(msg.chat.id, "🔥 VIP qilindi!");
    }

    else if (text.startsWith('delete ') && msg.from.id === ADMIN_ID) {
        const id = text.split(' ')[1];
        await db.collection("jobs").doc(id).delete();
        bot.sendMessage(msg.chat.id, "❌ O‘chirildi!");
    }
});

// 🔥 APPLY BUTTON
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

// PAYMENT
bot.on('photo', async (msg) => {
    bot.sendMessage(ADMIN_ID, `💰 Yangi to‘lov!\nUser: ${msg.from.id}`);
    bot.forwardMessage(ADMIN_ID, msg.chat.id, msg.message_id);
    bot.sendMessage(msg.chat.id, "✅ Tekshirilmoqda");
});