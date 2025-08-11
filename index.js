const express = require('express');
const axios = require('axios');

const app = express();

// 从环境变量读取 Webhook URL
const WX_WEBHOOK_URL = process.env.WX_WEBHOOK_URL;
if (!WX_WEBHOOK_URL) {
    console.error("❌ 请先设置环境变量 WX_WEBHOOK_URL");
    process.exit(1);
}

// 价格波动阈值（百分比）
const THRESHOLD = 0.5;
let lastPrice = null;

// 获取 ETH 美元价格（用 Coinbase API，防止 451/429）
async function getETHPrice() {
    try {
        const res = await axios.get('https://api.coinbase.com/v2/prices/ETH-USD/spot');
        return parseFloat(res.data.data.amount);
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
            text: { content: text }
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

// HTTP 接口（防 Render 关掉服务）
app.get('/', (req, res) => {
    res.send('🚀 ETH 价格监控服务正在运行...');
});

// 监听 Render 分配的端口
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Web 服务已启动，监听端口 ${PORT}`);
});
