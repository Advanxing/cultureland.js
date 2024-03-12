import cors from "cors";
import express from "express";
import morgan from "morgan";
import Cultureland from "./cultureland.js";

const app = express();

const captchaKey = "";
const tokens = [
    "00000000-0000-0000-0000-000000000000"
];


process.on("uncaughtException", function (err, origin) {
    console.log(`[ UNCAUGHTEXCEPTION - ${err.name} ]`, err, origin);
});

process.on("unhandledRejection", function (err, origin) {
    console.log("[ UNHANDLEDREJECTION ]", err, origin);
});


/**
 * 현재 날짜 및 시간을 반환합니다.
 * @returns `yyyy-MM-dd HH:mm:ss`
 */
function getDateString() {
    return new Date().toISOString().replace("T", " ").split(".")[0];
}


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan("combined"));

app.use((req, res, next) => {
    if (req.method === "POST") {
        req.body.token = tokens[0]; // 토큰 체크 비활성화 (DEBUG)

        const { id, password, token } = req.body;

        if (typeof id !== "string" || typeof password !== "string" || typeof token !== "string") {
            console.log(`[${getDateString()}] NO_TOKEN | ERR_INVALID_TYPE`);
            return res.status(400).json({
                amount: 0,
                message: "잘못된 요청입니다.",
                success: false
            });
        }

        if (!tokens.includes(token)) {
            console.log(`[${getDateString()}] ${token.slice(0, 8)} | ERR_INVALID_TOKEN`);
            return res.status(401).json({
                amount: 0,
                message: "잘못된 API 토큰입니다.",
                success: false
            });
        }

        if (!id.trim() || !password.trim()) {
            console.log(`[${getDateString()}] ${token.slice(0, 8)} | ERR_LOGIN_REQUIRED`);
            return res.status(400).json({
                amount: 0,
                message: "아이디 또는 패스워드를 입력하세요.",
                success: false
            });
        }
    }

    next();
});

app.post("/balance", async function (req, res) {
    const { id, password, token } = req.body;

    const client = new Cultureland();

    const loginResult = await client.login(id.trim(), password.trim(), captchaKey).catch(console.error);
    if (!loginResult) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | LoginFailed - Server Error`);
        return res.status(500).json({
            success: false,
            message: "알 수 없는 오류가 발생하였습니다.",
            amount: 0
        });
    }
    else if (!loginResult.success) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | LoginFailed - ${JSON.stringify(loginResult)}`);
        return res.status(400).json({
            success: false,
            message: loginResult.message,
            amount: 0
        });
    }

    const balanceResult = await client.getBalance().catch(console.error);
    if (!balanceResult) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | BalanceFailed - Server Error`);
        return res.status(500).json({
            success: false,
            message: "알 수 없는 오류가 발생하였습니다.",
            amount: 0
        });
    }
    else if (!balanceResult.success) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | BalanceFailed - ${balanceResult.message}`);
        return res.status(400).json({
            success: false,
            message: balanceResult.message,
            amount: 0
        });
    }

    console.log(`[${getDateString()}] ${token.slice(0, 8)} | BalanceSuccess - ${balanceResult.totalBalance}원 - ${JSON.stringify(balanceResult)}`);
    return res.status(200).json({
        success: true,
        message: "OK",
        amount: balanceResult.totalBalance
    });
});

app.post("/charge", async function (req, res) {
    const { id, password, pin, token } = req.body;

    const pinResult = Cultureland.checkPinFormat(pin);
    if (!pinResult.success) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | ${pinResult.message}`);
        return res.status(400).json({
            success: false,
            message: pinResult.message,
            amount: 0
        });
    }

    const client = new Cultureland();

    const loginResult = await client.login(id.trim(), password.trim(), captchaKey).catch(console.error);
    if (!loginResult) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | LoginFailed - Server Error`);
        return res.status(500).json({
            success: false,
            message: "알 수 없는 오류가 발생하였습니다.",
            amount: 0
        });
    }
    else if (!loginResult.success) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | LoginFailed - ${JSON.stringify(loginResult)}`);
        return res.status(400).json({
            success: false,
            message: loginResult.message,
            amount: 0
        });
    }

    const chargeResult = await client.charge(pinResult.parts!.join("")).catch(console.error);
    if (!chargeResult) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | ChargeFailed - Server Error`);
        return res.status(500).json({
            success: false,
            message: "알 수 없는 오류가 발생하였습니다.",
            amount: 0
        });
    }
    else if (!chargeResult.success) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | ChargeFailed - ${JSON.stringify(chargeResult)}`);
        return res.status(400).json({
            success: false,
            message: chargeResult.message,
            amount: 0
        });
    }

    console.log(`[${getDateString()}] ${token.slice(0, 8)} | ChargeSuccess - ${chargeResult.message} - ${chargeResult.amount}원`);
    return res.status(200).json({
        success: !!chargeResult.amount,
        message: chargeResult.message,
        amount: chargeResult.amount
    });
});

app.post("/bulkCharge", async function (req, res) {
    const { id, password, pins, token } = req.body;

    if (!Array.isArray(pins)) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | BulkChargeFailed - ERR_INVALID_TYPE`);
        return res.status(400).json({
            success: false,
            message: "pins는 상품권들의 핀번호로 구성된 배열이어야 합니다.",
            amount: 0
        });
    }

    const client = new Cultureland();

    const loginResult = await client.login(id.trim(), password.trim(), captchaKey).catch(console.error);
    if (!loginResult) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | LoginFailed - Server Error`);
        return res.status(500).json(Array(pins.length).fill({
            success: false,
            message: "알 수 없는 오류가 발생하였습니다.",
            amount: 0
        }));
    }
    else if (!loginResult.success) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | LoginFailed - ${JSON.stringify(loginResult)}`);
        return res.status(400).json(Array(pins.length).fill({
            success: false,
            message: loginResult.message,
            amount: 0
        }));
    }

    const chargeResults = await client.bulkCharge(pins).catch(console.error);
    if (!chargeResults) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | BulkChargeFailed - Server Error`);
        return res.status(500).json(Array(pins.length).fill({
            success: false,
            message: "알 수 없는 오류가 발생하였습니다.",
            amount: 0
        }));
    }

    for (const chargeResult of chargeResults) {
        if (chargeResult.success) {
            console.log(`[${getDateString()}] ${token.slice(0, 8)} | BulkChargeSuccess - ${chargeResult.message} - ${chargeResult.amount}원`);
        }
        else {
            console.log(`[${getDateString()}] ${token.slice(0, 8)} | BulkChargeFailed - ${chargeResult.message}`);
        }
    }

    return res.status(200).json(chargeResults.map(res => ({ ...res, success: !!res.amount })));
});

app.post("/gift", async function (req, res) {
    const { id, password, amount, token } = req.body;

    if (typeof amount !== "number" || amount < 1000 || amount > 50000 || amount % 100 !== 0) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | GiftFailed - ${amount}원`);
        return res.status(400).json({
            success: false,
            message: "구매금액은 최소 1천원부터 최대 5만원까지 100원 단위로 입력 가능합니다.",
            pin: ""
        });
    }

    const client = new Cultureland();

    const loginResult = await client.login(id.trim(), password.trim(), captchaKey).catch(console.error);
    if (!loginResult) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | LoginFailed - Server Error`);
        return res.status(500).json({
            success: false,
            message: "알 수 없는 오류가 발생하였습니다.",
            pin: ""
        });
    }
    else if (!loginResult.success) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | LoginFailed - ${JSON.stringify(loginResult)}`);
        return res.status(400).json({
            success: false,
            message: loginResult.message,
            pin: ""
        });
    }

    const giftResult = await client.gift(amount).catch(console.error);
    if (!giftResult) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | GiftFailed - Server Error`);
        return res.status(500).json({
            success: false,
            message: "알 수 없는 오류가 발생하였습니다.",
            pin: ""
        });
    }
    else if (!giftResult.success) {
        console.log(`[${getDateString()}] ${token.slice(0, 8)} | GiftFailed - ${JSON.stringify(giftResult)}`);
        return res.status(400).json({
            success: false,
            message: giftResult.message,
            pin: ""
        });
    }

    console.log(`[${getDateString()}] ${token.slice(0, 8)} | GiftSuccess - ${amount}원 - ${giftResult.pin}`);
    return res.status(200).json({
        success: true,
        message: giftResult.message,
        pin: giftResult.pin
    });
});

app.use(function(req, res) {
    return res.status(404).json({ success: false, message: "Not Found" });
});

app.use(function(error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) {
    console.error("Internal Server Error", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
});

app.listen(3002, function() {
    console.log(`[${getDateString()}] Listening on port 3002!`);
});
