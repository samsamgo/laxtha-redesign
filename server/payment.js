const PORTONE_API_BASE = 'https://api.iamport.kr';

function shouldUseMock() {
  const { PORTONE_IMP_KEY, PORTONE_IMP_SECRET, MOCK_PAYMENT } = process.env;
  return MOCK_PAYMENT === 'true' || !PORTONE_IMP_KEY || !PORTONE_IMP_SECRET;
}

async function requestJson(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.code !== 0) {
    const message = payload.message || `PortOne request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload.response;
}

async function getToken() {
  const { PORTONE_IMP_KEY, PORTONE_IMP_SECRET } = process.env;
  const token = await requestJson(`${PORTONE_API_BASE}/users/getToken`, {
    method: 'POST',
    body: JSON.stringify({
      imp_key: PORTONE_IMP_KEY,
      imp_secret: PORTONE_IMP_SECRET
    })
  });
  return token.access_token;
}

export async function verifyPayment({ imp_uid, expectedAmount }) {
  if (shouldUseMock()) {
    return {
      paid: true,
      status: 'paid',
      amount: expectedAmount,
      mock: true
    };
  }

  if (!imp_uid) {
    return {
      paid: false,
      status: 'missing_imp_uid',
      amount: 0,
      mock: false
    };
  }

  const accessToken = await getToken();
  const payment = await requestJson(
    `${PORTONE_API_BASE}/payments/${encodeURIComponent(imp_uid)}`,
    {
      method: 'GET',
      headers: {
        Authorization: accessToken
      }
    }
  );

  const paid = payment.status === 'paid' && Number(payment.amount) === Number(expectedAmount);

  return {
    paid,
    status: payment.status,
    amount: Number(payment.amount),
    mock: false,
    pgProvider: payment.pg_provider,
    paidAt: payment.paid_at
  };
}
