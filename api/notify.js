import { WechatPay } from 'wechatpay-node-v3';
import cors from 'cors';

const corsMiddleware = cors({ origin: '*', methods: ['POST', 'OPTIONS'] });

export default async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  await new Promise((resolve, reject) => {
    corsMiddleware(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });

  if (req.method === 'POST') {
    try {
      const pay = new WechatPay({
        mchid: process.env.WECHAT_PAY_MCH_ID,
        serial: process.env.WECHAT_PAY_CERT_SERIAL,
        privateKey: process.env.WECHAT_PAY_PRIVATE_KEY,
        cert: process.env.WECHAT_PAY_CERT,
        apiv3Key: process.env.WECHAT_PAY_API_V3_KEY
      });

      // 验证微信支付的回调签名（防止伪造请求）
      const signature = req.headers['wechatpay-signature'];
      const timestamp = req.headers['wechatpay-timestamp'];
      const nonce = req.headers['wechatpay-nonce'];
      const body = await req.text(); // 获取回调内容

      const verifyResult = pay.verifyCallbackSignature(
        signature,
        timestamp,
        nonce,
        body
      );

      if (!verifyResult) {
        return res.status(400).json({ code: 'SIGN_ERROR', message: '签名验证失败' });
      }

      // 签名验证通过，解析回调内容（这里可添加自己的业务逻辑，如更新订单状态）
      const callbackData = JSON.parse(body);
      console.log('支付成功回调：', callbackData);

      // 必须返回微信支付要求的格式（否则会重复回调）
      res.status(200).json({ code: 'SUCCESS', message: '成功' });
    } catch (err) {
      res.status(500).json({ code: 'ERROR', message: err.message });
    }
  } else {
    res.status(405).end();
  }
};
