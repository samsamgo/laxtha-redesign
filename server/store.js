import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve('data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(ORDERS_FILE, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    await writeFile(ORDERS_FILE, '[]\n', 'utf8');
  }

  try {
    await readFile(INQUIRIES_FILE, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    await writeFile(INQUIRIES_FILE, '[]\n', 'utf8');
  }
}

async function readOrders() {
  await ensureStore();
  const raw = await readFile(ORDERS_FILE, 'utf8');
  return raw.trim() ? JSON.parse(raw) : [];
}

async function writeOrders(orders) {
  await ensureStore();
  await writeFile(ORDERS_FILE, `${JSON.stringify(orders, null, 2)}\n`, 'utf8');
}

async function readInquiries() {
  await ensureStore();
  const raw = await readFile(INQUIRIES_FILE, 'utf8');
  return raw.trim() ? JSON.parse(raw) : [];
}

async function writeInquiries(inquiries) {
  await ensureStore();
  await writeFile(INQUIRIES_FILE, `${JSON.stringify(inquiries, null, 2)}\n`, 'utf8');
}

export async function createOrder(order) {
  const orders = await readOrders();
  orders.push(order);
  await writeOrders(orders);
  return order;
}

export async function createInquiry(inquiry) {
  const inquiries = await readInquiries();
  inquiries.push(inquiry);
  await writeInquiries(inquiries);
  return inquiry;
}

export async function getOrder(orderId) {
  const orders = await readOrders();
  return orders.find((order) => order.orderId === orderId) || null;
}

export async function findOrderByMerchantUid(merchantUid) {
  const orders = await readOrders();
  return orders.find((order) => order.merchant_uid === merchantUid) || null;
}

export async function updateOrder(orderId, patch) {
  const orders = await readOrders();
  const index = orders.findIndex((order) => order.orderId === orderId);

  if (index === -1) {
    return null;
  }

  orders[index] = {
    ...orders[index],
    ...patch,
    updatedAt: new Date().toISOString()
  };
  await writeOrders(orders);
  return orders[index];
}
