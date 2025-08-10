const axios = require('axios');

// 从环境变量读取 Webhook URL（Render 环境变量设置）
const WX_WEBHOOK_URL = process.env.WX_WEBHOOK_URL;
if (!WX_WEBHOOK_URL) {
    console.error("❌ 请先设置环境变量 WX_WEBHOOK_URL");
    process.exit(1);
}

// 价格波动阈值（0.5%）
const THRESHOLD = 0.5;

// 上一次价格
let lastPrice = null;

// 获取 ETH 美元价格（来自 Binance）
async function getETHPrice() {
    try {
        const res = await axios.get('https://api.binance.com/api/v3/ticker/price', {
            params: { symbol: 'ETHUSDT' }
        });
        return Number(res.data.price);
    } catch (err) {
        console.error("获取价格失败:", err.message);
        return null;
    }
}

// 发送企业微信通知
async function sendToWeChat(text) {
    try {
        await axios.post(WX_WEBHOOK_URL, {
            msgtype: "text",
            text: {
                content: text
            }
        });
        console.log("✅ 已推送:", text);
    } catch (err) {
        console.error("推送失败:", err.message);
    }
}

// 监控逻辑
async function monitor() {
    const price = await getETHPrice();
    if (!price) return;

    console.log(`当前价格: ${price} USD`);

    if (lastPrice) {
        const change = ((price - lastPrice) / lastPrice) * 100;
        if (Math.abs(change) >= THRESHOLD) {
            await sendToWeChat(
                `🚨 ETH 价格波动提醒\n当前价格: ${price} USD\n变化幅度: ${change.toFixed(2)}%\n时间: ${new Date().toLocaleString()}`
            );
        }
    }

    lastPrice = price;
}

// 每分钟执行一次
console.log("⏳ ETH 价格波动监控已启动，每分钟检测一次...");
monitor();
setInterval(monitor, 60 * 1000);
