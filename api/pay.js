import { WechatPay, FormData } from 'wechatpay-node-v3';
import cors from 'cors';

// 处理跨域（允许小程序域名访问）
const corsMiddleware = cors({
  origin: process.env.WECHAT_MINIPROGRAM_DOMAIN || '*', // 后续通过环境变量配置你的小程序域名
  methods: ['POST', 'OPTIONS']
});

export default async (req, res) => {
  // 先处理跨域预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // 应用跨域配置
  await new Promise((resolve, reject) => {
    corsMiddleware(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });

  if (req.method === 'POST') {
    try {
      // 从环境变量获取微信支付配置（后续在Vercel中设置）
      const pay = new WechatPay({
        mchid: process.env.WECHAT_PAY_MCH_ID,         // 商户号
        serial: process.env.WECHAT_PAY_CERT_SERIAL,   // 证书序列号
        privateKey: process.env.WECHAT_PAY_PRIVATE_KEY, // 商户私钥
        cert: process.env.WECHAT_PAY_CERT,            // 商户证书
        apiv3Key: process.env.WECHAT_PAY_API_V3_KEY,  // APIv3密钥
        appid: process.env.WECHAT_APPID               // 小程序AppID
      });

      // 接收小程序传来的参数（如订单金额、商品描述）
      const { totalFee, description, outTradeNo } = req.body;

      // 调用微信支付“统一下单”API
      const result = await pay.transactions_jsapi({
        description: description || '商品支付', // 商品描述
        out_trade_no: outTradeNo || Date.now().toString(), // 订单号（需唯一）
        amount: { total: totalFee || 1 }, // 支付金额（单位：分，这里默认1分用于测试）
        payer: { openid: req.body.openid }, // 小程序用户的openid（需从小程序端传入）
        notify_url: process.env.NOTIFY_URL // 支付结果回调地址（后续配置）
      });

      // 返回支付参数给小程序（用于调起支付）
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  } else {
    res.status(405).json({ error: '只支持POST请求' });
  }
};
