require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const { db } = require("./firebase");

const ADMIN_ID = 5869201380;

const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("Bot ishlayapti 🚀");
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});

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

// VIP COMMAND
bot.onText(/\/vip/, (msg) => {
    bot.sendMessage(msg.chat.id, `
💎 VIP e'lon qilish

Narxi: 5 000 so'm

💳 To‘lov:
Click / Payme:   5614681916164076

📸 To‘lovdan keyin screenshot yuboring
    `);
});

// ADMIN PANEL
bot.onText(/\/admin/, (msg) => {
    if (msg.from.id !== ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, "❌ Ruxsat yo‘q");
    }

    bot.sendMessage(msg.chat.id, `
🛠 Admin panel:

📋 Ishlarni ko‘rish → "admin jobs"
⭐ VIP qilish → "vip ID"
❌ Ishni o‘chirish → "delete ID"
    `);
});

// MAIN MESSAGE HANDLER
bot.on('message', async (msg) => {
    const text = msg.text || "";

    // 👤 ISH IZLASH
    if (text === '👤 Ish izlayapman') {
        try {
            const snapshot = await db.collection("jobs").get();

            if (snapshot.empty) {
                return bot.sendMessage(msg.chat.id, "❌ Hozircha ishlar yo‘q");
            }

            snapshot.forEach(doc => {
                const job = doc.data();

                let message = `🧾 ${job.text}`;

                if (job.isPremium) {
                    message = `🔥 VIP ISH\n\n${message}`;
                }

                bot.sendMessage(msg.chat.id, message, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "📩 Ariza berish",
                                    callback_data: doc.id
                                }
                            ]
                        ]
                    }
                });
            });

        } catch (error) {
            console.log(error);
            bot.sendMessage(msg.chat.id, "❌ Xatolik yuz berdi");
        }
    }

    // 🏢 ISH BERISH
    else if (text === '🏢 Ish beraman') {
        bot.sendMessage(msg.chat.id, `
📝 Ish e'lon yuboring:

Lavozim:
Maosh:
Manzil:
Tel:

💎 VIP qilish uchun: /vip
        `);
    }

    // 💾 SAQLASH
    else if (text.includes('Lavozim:')) {
        try {
            await db.collection("jobs").add({
                text: text,
                createdAt: new Date(),
                isPremium: false
            });

            bot.sendMessage(msg.chat.id, "✅ Ish e'lon saqlandi!");
        } catch (error) {
            console.log(error);
            bot.sendMessage(msg.chat.id, "❌ Xatolik yuz berdi");
        }
    }

    // 📋 ADMIN - ISHLARNI KO‘RISH
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

    else if (text.startsWith('vip ') && msg.from.id === ADMIN_ID) {
        try {
            const id = text.split(' ')[1];

            await db.collection("jobs").doc(id).update({
                isPremium: true
            });

            bot.sendMessage(msg.chat.id, "🔥 VIP qilindi!");
        } catch (error) {
            bot.sendMessage(msg.chat.id, "❌ Xatolik (ID noto‘g‘ri bo‘lishi mumkin)");
        }
    }

    // ❌ ADMIN - O‘CHIRISH
    else if (text.startsWith('delete ') && msg.from.id === ADMIN_ID) {
        const id = text.split(' ')[1];

        await db.collection("jobs").doc(id).delete();

        bot.sendMessage(msg.chat.id, "❌ O‘chirildi!");
    }
});

// 📩 APPLY
bot.on("callback_query", async (query) => {
    const jobId = query.data;
    const chatId = query.message.chat.id;

    try {
        const doc = await db.collection("jobs").doc(jobId).get();

        if (!doc.exists) {
            return bot.sendMessage(chatId, "❌ Ish topilmadi");
        }

        const job = doc.data();

        bot.sendMessage(chatId, `
📩 Ariza berish uchun:

${job.text}
        `);

    } catch (error) {
        console.log(error);
        bot.sendMessage(chatId, "❌ Xatolik yuz berdi");
    }
});

bot.onText(/\/start (.+)/, async (msg, match) => {
    const jobId = match[1];
    const chatId = msg.chat.id;

    try {
        const doc = await db.collection("jobs").doc(jobId).get();

        if (!doc.exists) {
            return bot.sendMessage(chatId, "❌ Ish topilmadi");
        }

        const job = doc.data();

        bot.sendMessage(chatId, `
📩 Siz quyidagi ishga ariza bermoqdasiz:

${job.text}
        `);

    } catch (error) {
        console.log(error);
        bot.sendMessage(chatId, "❌ Xatolik yuz berdi");
    }
});

bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;

    // Adminga yuboramiz
    bot.sendMessage(ADMIN_ID, `
💰 Yangi to‘lov!

User: ${msg.from.id}
    `);

    bot.forwardMessage(ADMIN_ID, chatId, msg.message_id);

    bot.sendMessage(chatId, "✅ To‘lovingiz qabul qilindi, tekshirilmoqda");
});