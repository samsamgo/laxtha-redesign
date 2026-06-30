# LAXTHA 홈페이지 업그레이드 — 설계 & 매핑

## 컨셉
Binance 디자인 시스템(딥 다크 캔버스 + 단일 옐로 악센트 + 신호 그래프)을 **생체신호 계측 전문기업** LAXTHA에 이식.
핵심 통찰: Binance의 "트레이딩 차트(green/red)"는 LAXTHA에서 **ECG/EEG/EMG 생체신호 파형**으로 자연스럽게 치환된다. 신호를 색 파형으로 보여주는 정체성이 디자인 언어와 완벽히 맞물림.

## 디자인 → LAXTHA 섹션 매핑
| Binance 컴포넌트 | LAXTHA 적용 |
|---|---|
| top-nav-dark (옐로 워드마크) | LAXTHA 워드마크(옐로) + 메뉴: 제품 / 브랜드 / 기술자료 / 고객지원 / 회사소개 + 로그인·회원가입(옐로 pill)·장바구니 |
| hero-band-dark + search-input | 헤드라인 "정밀 생체신호 계측의 기준" + 듀얼 CTA(제품 보기/견적 문의) + 제품 검색창 + **실시간 ECG/EEG 파형 모션** |
| trust-badge | "국내 No.1 생체신호 센서" + 브랜드 뱃지(ubpulse / neuroNicle / iobid) |
| funds-safu-band + stat-callout | "정밀 · 신뢰" 밴드 + 옐로 대형 숫자(누적 출하, 도입 연구기관, 측정 채널, 운영 연수) — BinancePlex |
| markets-table-card + markets-row | **제품 테이블 카드**: 탭(인기/신제품/EEG/EMG/ECG·맥파) + 행(아이콘+제품명 / 브랜드 / 사양 / 가격 / [담기] 옐로 버튼). 사양 셀은 신호색 악센트 |
| price-up/down-cell | 신호 상태 셀(채널수·샘플레이트 강조색: green=EEG, turquoise=EMG, red=ECG 계열 시각 구분) |
| feature-photo-card (3-up) | 카테고리 그리드: EEG / EMG / ECG·맥파 — 원본 제품 이미지 슬롯 |
| qr-promo-card | 측정 소프트웨어(Telescan 등) 다운로드 카드 + QR |
| faq-row | 자주 묻는 질문(배송/견적/대학 선결제/A.S.) 아코디언 |
| cta-band-dark | 프리풋터 CTA "연구에 필요한 정밀 계측, 지금 시작하세요" + 옐로 버튼 |
| footer-light | 라이트(#fafafa) 푸터: 회사정보(주소/전화/사업자번호) + 6열 링크 |

## 디자인 토큰 핵심
- 캔버스 `#0b0e11`, 카드 `#1e2329`, 악센트 옐로 `#FCD535`(black-on-yellow CTA)
- 폰트: BinanceNova→**Inter**, BinancePlex(숫자)→**IBM Plex Sans / JetBrains Mono**
- 신호 시맨틱 색: green `#0ecb81`, red `#f6465d`, turquoise `#2dbdb6` → 생체신호 채널 구분에 사용(트레이딩 의미 아님)
- 라운드 6/8/12px, 섹션 간격 80px, 최대폭 1280px

## 산출물
```
laxtha-redesign/
  index.html              # 단일 페이지(전 섹션)
  assets/css/tokens.css   # 디자인 토큰 (Claude 작성)
  assets/css/main.css     # 컴포넌트 스타일 (Codex)
  assets/js/app.js        # 탭/아코디언/모바일나브/파형 모션 (Codex)
  assets/js/products.js   # 제품 데이터 (Codex, 실제 제품명/가격)
  assets/products/        # 원본 제품 이미지 슬롯
  README.md               # 실행법 (Codex)
```

## 실행/검증
- 빌드 도구 없는 정적 사이트 → `python -m http.server` 또는 더블클릭으로 미리보기.
- 검증: 디자인 토큰 준수, 반응형(모바일 햄버거/테이블 스크롤), 접근성(대비/포커스), 제품 데이터 정확성.
