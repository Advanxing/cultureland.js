# cultureland.js
[컬쳐랜드 모바일웹](https://m.cultureland.co.kr/)을 자동화해주는 비공식 라이브러리입니다.<br>
로그인, 잔액조회, 충전, 선물 등 자주 사용되는 대부분의 기능을 지원합니다.<br>
기능 추가 요청은 이슈 / 풀 리퀘스트 / 디스코드 서버를 이용해주세요.

## 필독
**교육용 및 학습용으로만 사용해 주세요**<br>
이 프로젝트 혹은 리포지토리를 사용함으로써 발생하는 모든 피해나 손실은 모두 본인의 책임입니다.

## 디스코드
아래 서버에서 도움을 요청해 보세요!<br>
[Discord xB2Jae97z7](https://discord.gg/xB2Jae97z7)

## 사용
터미널에서 아래 명령어를 입력하여 라이브러리를 설치해주세요:
```bash
npm install cultureland.js@dev
```

사용 전에 [컬쳐랜드 모바일웹](https://m.cultureland.co.kr/mmb/loginMain.do)에서 로그인 유지 쿠키를 가져와 주세요.<br>
로그인 유지 옵션을 활성화한 후 로그인하면 'KeepLoginConfig' 쿠키를 발급받을 수 있습니다.<br>
아이디와 비밀번호를 사용할 경우 hCaptcha 해결이 필요하기 때문에 본 라이브러리에서는 이 쿠키값을 사용하여 컬쳐랜드에 로그인합니다.

### 클라이언트 생성
```typescript
const Cultureland = require("cultureland.js"); // CommonJS style
import Cultureland from "cultureland.js"; // ES style

const client = new Cultureland();
```

### 로그인 (로그인 유지 쿠키)
로그인 유지 쿠키를 사용하여 컬쳐랜드에 로그인합니다.
```typescript
<Cultureland>.login(keepLoginInfo: string): Promise<CulturelandLogin>
```

파라미터:
* keepLoginInfo (string): 로그인 유지 쿠키

반환값:
* CulturelandLogin
  * userId (string): 컬쳐랜드 ID
  * keepLoginInfo (string): 로그인 유지 쿠키

```typescript
await client.login("KeepLoginConfig")
    .then(creds => console.log(`로그인 성공 | 아이디: ${creds.userId} | 로그인 유지 쿠키: ${creds.keepLoginInfo}`))
    .catch(console.error);
```

### 잔액 조회
컬쳐랜드 계정의 컬쳐캐쉬 잔액을 가져옵니다.
```typescript
<Cultureland>.getBalance(): Promise<CulturelandBalance>
```

반환값:
* CulturelandBalance
  * balance (number): 사용 가능 금액
  * safeBalance (number): 보관중인 금액 (안심금고)
  * totalBalance (number): 총 잔액 (사용 가능 금액 + 보관중인 금액)

```typescript
await client.getBalance()
    .then(balance => console.log(`잔액: ${balance.balance.toLocaleString()}원 | 안심금고: ${balance.safeBalance.toLocaleString()}원`))
    .catch(console.error);
```

### 충전
컬쳐랜드상품권(모바일문화상품권) 및 문화상품권(18자리)을 컬쳐캐쉬로 충전합니다.<br>
지류/온라인문화상품권(18자리)은 2022.12.31 이전 발행 건만 충전 가능합니다.
```typescript
<Cultureland>.charge(pins: Pin | Pins[]): Promise<CulturelandCharge | CulturelandCharge[]>
```

파라미터:
* pins (Pin | Pins[]): 상품권(들)의 핀번호

반환값:
* CulturelandCharge | CulturelandCharge[]
  * message (string): 성공 여부 메시지 - `충전 완료` `상품권지갑 보관` `잔액이 0원인 상품권` `상품권 번호 불일치`
  * amount (number): 충전 금액

```typescript
const { Pin } = require("cultureland.js"); // CommonJS style
import { Pin } from "cultureland.js"; // ES style

if (!Pin.validateClientSide("3110-0123-4567-8901")) {
    console.error("핀번호가 올바르지 않습니다.");
    process.exit(1);
}

// 한 개의 핀번호 충전
await client.charge(new Pin("3110-0123-4567-8901"))
    .then(charge => console.log(`${charge.message} | ${charge.amount.toLocaleString()}원`))
    .catch(console.error);

// 여러개의 핀번호 충전
await client.charge([
    new Pin("3110-0123-4567-8901"),
    new Pin("3110-0123-4567-8901")
]).then(console.log);
```

### 선물
컬쳐캐쉬를 사용해 컬쳐랜드상품권(모바일문화상품권)을 휴대폰 번호로 선물합니다.
```typescript
<Cultureland>.gift(amount: number, phoneNumber?: string): Promise<CulturelandGift>
```

파라미터:
* amount (number): 구매 금액 (최소 1천원부터 최대 5만원까지 100원 단위로 입력 가능)
* phoneNumber? (string): 수신자 휴대폰 번호

반환값:
* CulturelandGift
  * pin (Pin): 선물 바코드 번호
  * url (string): 선물 바코드 URL
  * controlCode (string): 선물 발행번호

```typescript
// 5000원권 1장을 나에게 선물
await client.gift(5000)
    .then(gift => console.log(`핀번호: ${gift.pin.toString()} | URL: ${gift.url}`))
    .catch(console.error);

// 5000원권 1장을 010-1234-5678에게 선물
await client.gift(5000, "01012345678")
    .then(gift => console.log(`핀번호: ${gift.pin.toString()} | URL: ${gift.url}`))
    .catch(console.error);
```

### 구글플레이 기프트코드
컬쳐캐쉬를 사용해 Google Play 기프트 코드를 본인 번호로 구매합니다.<br>
안심금고가 활성화되어 있어야 합니다.<br>
구매 금액의 3% 수수료가 발생됩니다. (전환 비율 1.03:1)
```typescript
<Cultureland>.giftGooglePlay(amount: number, quantity: number = 1): Promise<CulturelandGooglePlay[]>
```

파라미터:
* amount (number): 구매 금액 (5천원, 1만원, 1만5천원, 3만원, 5만원, 10만원, 15만원, 20만원)
* quantity (number): 구매 수량 (최대 10개)

반환값:
* CulturelandGooglePlay[]
  * pin (string): 기프트 코드 번호
  * url (string): 자동 입력 URL
  * certNumber (string): 발행번호 (인증번호)

```typescript
// 10000원권 1장을 구매하여 나에게 전송, 컬쳐캐쉬 10300원 차감
await client.giftGooglePlay(10000);
```