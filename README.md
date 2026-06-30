# LAXTHA e-shop

순수 Node/Express와 바닐라 HTML/CSS/JS로 구성한 LAXTHA 전자상거래 데모입니다. 제품 데이터는 `data/products.json`이 단일 소스이며, 주문 금액은 서버가 이 파일의 가격으로 다시 계산합니다.

## 설치와 실행

```bash
npm install
npm start
```

브라우저에서 `http://localhost:8080`을 엽니다.

## 구조

```text
server/
  server.js       Express 정적 서빙 및 API
  store.js        data/orders.json 파일 기반 주문 저장소
  payment.js      PortOne v1 REST 검증 및 mock 폴백
data/
  products.json   제품 데이터 단일 소스
public/
  products.html
  product.html
  cart.html
  checkout.html
  order-complete.html
  assets/css/shop.css
  assets/js/data.js
  assets/js/cart.js
  assets/js/catalog.js
  assets/js/product.js
  assets/js/checkout.js
  assets/js/order.js
```

## 결제 테스트

기본 `.env.example` 설정은 `MOCK_PAYMENT=true`입니다. 실제 PortOne 키가 없어도 주문서에서 결제하기를 누르면 mock `imp_uid`로 `/api/payment/complete`가 호출되고 주문이 `paid` 상태로 저장됩니다.

PortOne KCP 테스트 채널로 검증하려면 `.env`에 `PORTONE_IMP_KEY`, `PORTONE_IMP_SECRET`, `MOCK_PAYMENT=false`를 설정합니다. Secret은 서버에서만 사용하며 프론트에 노출하지 않습니다. 프론트의 `IMP.init` 가맹점 식별코드는 `public/assets/js/checkout.js`의 `window.LAXTHA_PORTONE_IMP_CODE || 'imp00000000'` 값을 테스트용 코드로 주입하거나 교체해 사용합니다.

## 제품 이미지 교체

제품 이미지는 `public/assets/products/` 아래 파일을 사용합니다. `data/products.json`의 `img` 경로와 파일명을 유지하면 즉시 반영됩니다. 제품명, 가격, 사양 값은 쇼핑과 서버 금액 계산의 기준이므로 변경하지 마세요.
