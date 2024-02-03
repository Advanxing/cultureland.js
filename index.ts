import cors from "cors";
import express from "express";
import morgan from "morgan";
import Cultureland from "./cultureland.js";
const app = express();

declare module "express-serve-static-core" {
  export interface Request {
    start: number;
  }
};

const tokens = [
  "00000000-0000-0000-0000-000000000000"
];

process.on("uncaughtException", function (err, origin) {
  console.log(`[ UNCAUGHTEXCEPTION - ${err.name} ]`, err, origin);
});

process.on("unhandledRejection", function (err, origin) {
  console.log("[ UNHANDLEDREJECTION ]", err, origin);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan("combined"));

app.use((req, res, next) => {
  req.start = Date.now();
  if (req.method === "POST") {
    req.body.token = tokens[0]; // Disabled token check
    const { id, password, token } = req.body;

    if (typeof id !== "string" || typeof password !== "string" || typeof token !== "string") {
      console.log(`NO_TOKEN | ERR_INVALID_TYPE - ${Date.now() - req.start}ms`);
      return res.status(400).json({
        amount: 0,
        message: "잘못된 요청입니다.",
        success: false,
        timeout: Date.now() - req.start
      });
    };

    if (!tokens.includes(token)) {
      console.log(`${token.slice(0, 8)} | ERR_INVALID_TOKEN - ${Date.now() - req.start}ms`);
      return res.status(400).json({
        amount: 0,
        message: "잘못된 API토큰입니다.",
        success: false,
        timeout: Date.now() - req.start
      });
    };

    if (!id.trim() || !password.trim()) {
      console.log(`${token.slice(0, 8)} | ERR_LOGIN_REQUIRED - ${Date.now() - req.start}ms`);
      return res.status(400).json({
        amount: 0,
        message: "아이디 또는 비밀번호를 입력해주세요.",
        success: false,
        timeout: Date.now() - req.start
      });
    };
  };
  next();
});

app.post("/balance", async function (req, res) {
  const { id, password, token } = req.body;

  const client = new Cultureland();

  const loginResult = await client.login(id.trim(), password.trim());
  if (!loginResult.success) {
    console.log(`${token.slice(0, 8)} | LoginFailed - ${Date.now() - req.start}ms - ${JSON.stringify(loginResult)}`);
    return res.status(400).json({
      success: false,
      message: loginResult.message,
      amount: 0,
      timeout: Date.now() - req.start
    });
  };

  const balanceResult = await client.getBalance().catch(err => err);
  if (!balanceResult.success) {
    console.log(`${token.slice(0, 8)} | BalanceFailed - ${Date.now() - req.start}ms - ${balanceResult.message}`);
    return res.status(400).json({
      amount: 0,
      message: balanceResult.message,
      success: false,
      timeout: Date.now() - req.start
    });
  };

  console.log(`${token.slice(0, 8)} | BalanceSuccess - ${Date.now() - req.start}ms - ${balanceResult.data.myCash}원 - ${JSON.stringify(balanceResult.data)}`);
  return res.status(200).json({
    amount: balanceResult.myCash,
    message: "OK",
    success: true,
    timeout: Date.now() - req.start,
    data: balanceResult.data
  });
});

app.post("/charge", async function (req, res) {
  const { id, password, pin, token } = req.body;

  const pinResult = Cultureland.checkPinFormat(pin);
  if (!pinResult.success) {
    console.log(`${token.slice(0, 8)} | ${pinResult.message} - ${Date.now() - req.start}ms`);
    return res.status(400).json({
      success: false,
      message: pinResult.message,
      amount: 0,
      timeout: Date.now() - req.start
    });
  };

  const client = new Cultureland();

  const loginResult = await client.login(id.trim(), password.trim());
  if (!loginResult.success) {
    console.log(`${token.slice(0, 8)} | LoginFailed - ${Date.now() - req.start}ms - ${JSON.stringify(loginResult)}`);
    return res.status(400).json({
      success: false,
      message: loginResult.message,
      amount: 0,
      timeout: Date.now() - req.start
    });
  };

  const chargeResult = await client.charge(pinResult.pinParts, false);

  if (!chargeResult.success) {
    console.log(`${token.slice(0, 8)} | ChargeFailed - ${Date.now() - req.start}ms - ${JSON.stringify(chargeResult)}`);
    return res.status(400).json({
      success: false,
      message: chargeResult.message,
      amount: 0,
      timeout: Date.now() - req.start
    });
  };

  console.log(`${token.slice(0, 8)} | ChargeSuccess - ${Date.now() - req.start}ms - ${chargeResult.amount}원 - ${chargeResult.message.replace("<b>", "").replace("</b>", "")}`);
  return res.status(200).json({
    success: !!chargeResult.amount,
    message: chargeResult.message.replace("<b>", "").replace("</b>", ""),
    amount: chargeResult.amount,
    timeout: Date.now() - req.start
  });
});

app.post("/bulkCharge", async function (req, res) {
  const { id, password, pins, token } = req.body;

  const client = new Cultureland();

  const loginResult = await client.login(id.trim(), password.trim());
  if (!loginResult.success) {
    console.log(`${token.slice(0, 8)} | LoginFailed - ${Date.now() - req.start}ms - ${JSON.stringify(loginResult)}`);
    return res.status(400).json({
      success: false,
      message: loginResult.message,
      amount: 0,
      timeout: Date.now() - req.start
    });
  };

  const chargeResults = await client.bulkCharge(pins, false);

  for (const chargeResult of chargeResults) {
    if (chargeResult.success) {
      console.log(`${token.slice(0, 8)} | ChargeSuccess - ${Date.now() - req.start}ms - ${chargeResult.amount}원 - ${chargeResult.message}`);
    } else {
      console.log(`${token.slice(0, 8)} | ChargeFailed - ${Date.now() - req.start}ms - ${JSON.stringify(chargeResult)}`);
    }
  }

  return res.status(200).json({
    data: chargeResults,
    timeout: Date.now() - req.start
  });
});

app.post("/gift", async function (req, res) {
  const { id, password, amount, token } = req.body;

  if (typeof amount !== "number" || amount < 1000 || amount > 50000) {
    console.log(
      `${token.slice(0, 8)} | GiftFailed - ${Date.now() - req.start
      }ms - ${amount}`
    );
    return res.status(400).json({
      success: false,
      message: "금액은 1000원 이상 50000원 이하로 입력해주세요.",
      amount: 0,
      timeout: Date.now() - req.start,
    });
  }

  const client = new Cultureland();

  const loginResult = await client.login(id.trim(), password.trim());
  if (!loginResult.success) {
    console.log(
      `${token.slice(0, 8)} | LoginFailed - ${Date.now() - req.start
      }ms - ${JSON.stringify(loginResult)}`
    );
    return res.status(400).json({
      success: false,
      message: loginResult.message,
      amount: 0,
      timeout: Date.now() - req.start,
    });
  }

  const giftResult = await client.gift(amount);

  if (!giftResult.success) {
    console.log(
      `${token.slice(0, 8)} | GiftFailed - ${Date.now() - req.start
      }ms - ${JSON.stringify(giftResult)}`
    );
    return res.status(400).json({
      success: false,
      message: giftResult.message,
      amount: 0,
      timeout: Date.now() - req.start,
    });
  }

  console.log(
    `${token.slice(0, 8)} | GiftSuccess - ${Date.now() - req.start
    }ms - ${giftResult.amount}원 - ${giftResult.message}`
  );

  return res.status(200).json({
    success: giftResult.success,
    message: giftResult.message,
    amount: giftResult.amount,
    timeout: Date.now() - req.start,
    pin: giftResult.pin,
  });
});

app.use(function (req, res) {
  res.status(404).json({ success: false, message: "Not Found.", amount: 0, timeout: Date.now() - req.start });
});

app.use(function (error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) {
  console.error("Web Server ERROR!", error);
  res.status(500).json({ success: false, message: "Internal Server Error. Please try again later.", amount: 0, timeout: Date.now() - req.start });
});

app.listen(3002, function () {
  console.log("[LOG] Listening on port 3002");
});