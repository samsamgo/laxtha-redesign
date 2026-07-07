import 'dotenv/config';
import express from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInquiry, createOrder, findOrderByMerchantUid, getOrder, updateOrder } from './store.js';
import { verifyPayment } from './payment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const PRODUCTS_FILE = path.join(ROOT_DIR, 'data', 'products.json');
const PORT = Number(process.env.PORT || 8080);

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

async function loadCatalog() {
  const raw = await readFile(PRODUCTS_FILE, 'utf8');
  return JSON.parse(raw);
}

function normalizeQty(value) {
  const qty = Number.parseInt(value, 10);
  if (!Number.isFinite(qty) || qty < 1) {
    return 0;
  }
  return Math.min(qty, 99);
}

function makeId(prefix) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

function cleanText(value) {
  return String(value || '').trim();
}

function buildOrderItems(requestItems, products) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const merged = new Map();

  for (const item of Array.isArray(requestItems) ? requestItems : []) {
    const product = productMap.get(item.id);
    const qty = normalizeQty(item.qty);

    if (!product || !qty) {
      continue;
    }

    const prev = merged.get(product.id);
    merged.set(product.id, {
      id: product.id,
      name: product.name,
      brand: product.brand,
      cat: product.cat,
      spec: product.spec,
      img: product.img,
      price: product.price,
      qty: (prev?.qty || 0) + qty,
      subtotal: 0
    });
  }

  return Array.from(merged.values()).map((item) => ({
    ...item,
    subtotal: item.price * item.qty
  }));
}

app.get('/api/products', async (req, res, next) => {
  try {
    res.json(await loadCatalog());
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders', async (req, res, next) => {
  try {
    const catalog = await loadCatalog();
    const items = buildOrderItems(req.body.items, catalog.products);

    if (!items.length) {
      res.status(400).json({ error: '주문할 상품이 없습니다.' });
      return;
    }

    const amount = items.reduce((sum, item) => sum + item.subtotal, 0);
    const now = new Date().toISOString();
    const order = {
      orderId: makeId('order'),
      merchant_uid: makeId('laxtha'),
      status: 'pending',
      amount,
      items,
      customer: {
        name: String(req.body.customer?.name || '').trim(),
        tel: String(req.body.customer?.tel || '').trim(),
        email: String(req.body.customer?.email || '').trim(),
        addr: String(req.body.customer?.addr || '').trim(),
        memo: String(req.body.customer?.memo || '').trim()
      },
      createdAt: now,
      updatedAt: now
    };

    await createOrder(order);
    res.status(201).json({
      orderId: order.orderId,
      merchant_uid: order.merchant_uid,
      amount: order.amount,
      items: order.items
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/inquiries', async (req, res, next) => {
  try {
    const inquiry = {
      id: makeId('inq'),
      name: cleanText(req.body.name),
      org: cleanText(req.body.org),
      tel: cleanText(req.body.tel),
      email: cleanText(req.body.email),
      product: cleanText(req.body.product),
      message: cleanText(req.body.message),
      createdAt: new Date().toISOString()
    };

    if (!inquiry.name || !inquiry.tel || !inquiry.email || !inquiry.message) {
      res.status(400).json({ error: 'Missing required inquiry fields.' });
      return;
    }

    await createInquiry(inquiry);
    res.status(201).json({ ok: true, id: inquiry.id });
  } catch (error) {
    next(error);
  }
});

app.post('/api/payment/complete', async (req, res, next) => {
  try {
    const { imp_uid, merchant_uid } = req.body;
    const order = await findOrderByMerchantUid(merchant_uid);

    if (!order) {
      res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
      return;
    }

    const verification = await verifyPayment({
      imp_uid,
      merchant_uid,
      expectedAmount: order.amount
    });

    if (!verification.paid) {
      await updateOrder(order.orderId, {
        status: 'payment_failed',
        payment: verification
      });
      res.status(400).json({ error: '결제 검증에 실패했습니다.', payment: verification });
      return;
    }

    await updateOrder(order.orderId, {
      status: 'paid',
      paidAt: new Date().toISOString(),
      imp_uid: imp_uid || null,
      payment: verification
    });

    res.json({ status: 'paid', orderId: order.orderId });
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders/:id', async (req, res, next) => {
  try {
    const order = await getOrder(req.params.id);
    if (!order) {
      res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
      return;
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
});

app.post('/api/payment/webhook', async (req, res, next) => {
  try {
    const { imp_uid, merchant_uid } = req.body;
    const order = await findOrderByMerchantUid(merchant_uid);

    if (!order) {
      res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
      return;
    }

    const verification = await verifyPayment({
      imp_uid,
      merchant_uid,
      expectedAmount: order.amount
    });

    await updateOrder(order.orderId, {
      status: verification.paid ? 'paid' : 'payment_failed',
      imp_uid: imp_uid || order.imp_uid || null,
      payment: verification
    });

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`LAXTHA e-shop running at http://localhost:${PORT}`);
});
