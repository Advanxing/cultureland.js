import Cultureland from "./cultureland.js";
import express from "express";
import morgan from "morgan";
const app = express();

const tokens = [
    "00000000-0000-0000-0000-000000000000"
];

process.on("uncaughtException", function (err, origin) {
    console.log(`[ UNCAUGHTEXCEPTION - ${err.name} ]\n${err.message}\n${err.stack}\n${origin}`);
});

process.on("unhandledRejection", function (err, origin) {
    console.log(`[ UNHANDLEDREJECTION ]\n${typeof err === "object" ? JSON.stringify(err) : err.toString()}\n${origin}`);
});

app.use(express.json());
app.use(morgan("combined"));

app.post("/balance", async function (req, res) {
    const now = Date.now();

    const { id, password, token } = req.body;

    if (!id || !password) {
        console.log(`${token.split("-")[0]} | ERR_LOGIN_REQUIRED - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_LOGIN_REQUIRED",
            result: false,
            timeout: Date.now() - now
        });
    }

    if (!token) {
        console.log(`${token.split("-")[0]} | ERR_TOKEN_REQUIRED - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_TOKEN_REQUIRED",
            result: false,
            timeout: Date.now() - now
        });
    }

    if (!tokens.includes(token)) {
        console.log(`${token.split("-")[0]} | ERR_INVALID_TOKEN - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_INVALID_TOKEN",
            result: false,
            timeout: Date.now() - now
        });
    }

    const client = new Cultureland();

    const login = await client.login(id, password).catch(err => err);

    if (login.message) {
        console.log(`${token.split("-")[0]} | Login - ${Date.now() - now}ms - ${login.message}`);
        return res.status(500).json({
            amount: 0,
            reason: login.message,
            result: false,
            timeout: Date.now() - now
        });
    }

    if (!login) {
        console.log(`${token.split("-")[0]} | LoginResult - ${Date.now() - now}ms - ${typeof login === "object" ? JSON.stringify(login) : login.toString()}`);
        return res.status(500).json({
            amount: 0,
            reason: typeof login === "object" ? JSON.stringify(login) : login.toString(),
            result: false,
            timeout: Date.now() - now
        });
    }

    const balance = await client.getBalance().catch(err => err);

    if (balance.message) {
        console.log(`${token.split("-")[0]} | BalanceMessage - ${Date.now() - now}ms - ${balance.message}`);
        return res.status(500).json({
            amount: 0,
            reason: balance.message,
            result: false,
            timeout: Date.now() - now
        });
    }

    console.log(`${token.split("-")[0]} | BalanceSuccess - ${Date.now() - now}ms - ${balance.myCash}원 - ${JSON.stringify(balance)}`);
    return res.status(200).json({
        ...balance,
        amount: balance.myCash,
        reason: "OK",
        result: true,
        timeout: Date.now() - now
    });
});

app.post("/charge", async function (req, res) {
    const now = Date.now();

    const { id, password, pin, token } = req.body;

    if (!id || !password) {
        console.log(`${token.split("-")[0]} | ERR_LOGIN_REQUIRED - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_LOGIN_REQUIRED",
            result: false,
            timeout: Date.now() - now
        });
    }

    if (typeof id !== "string" || typeof password !== "string") {
        console.log(`${token.split("-")[0]} | ERR_INVALID_TYPE 1 - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_INVALID_TYPE 1",
            result: false,
            timeout: Date.now() - now
        });
    }

    if (!pin) {
        console.log(`${token.split("-")[0]} | ERR_PIN_REQUIRED - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_PIN_REQUIRED",
            result: false,
            timeout: Date.now() - now
        });
    }

    if (typeof pin !== "string") {
        console.log(`${token.split("-")[0]} | ERR_INVALID_TYPE 2 - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_INVALID_TYPE 2",
            result: false,
            timeout: Date.now() - now
        });
    }

    if (!token) {
        console.log(`${token.split("-")[0]} | ERR_TOKEN_REQUIRED - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_TOKEN_REQUIRED",
            result: false,
            timeout: Date.now() - now
        });
    }

    if (typeof token !== "string") {
        console.log(`${token.split("-")[0]} | ERR_INVALID_TYPE 3 - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_INVALID_TYPE 3",
            result: false,
            timeout: Date.now() - now
        });
    }

    if (!tokens.includes(token)) {
        console.log(`${token.split("-")[0]} | ERR_INVALID_TOKEN - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_INVALID_TOKEN",
            result: false,
            timeout: Date.now() - now
        });
    }

    var splitPin = [];
    if (pin.length === 16 || pin.length === 18) splitPin = [pin.substring(0, 4), pin.substring(4, 8), pin.substring(8, 12), pin.substring(12)];
    else if (pin.includes("-")) splitPin = pin.split("-");
    else if (pin.includes(" ")) splitPin = pin.split(" ");
    else if (pin.includes(".")) splitPin = pin.split(".");
    else if (pin.includes("_")) splitPin = pin.split("_");
    else if (pin.includes("ㅡ")) splitPin = pin.split("ㅡ");
    else if (pin.includes("ㅣ")) splitPin = pin.split("ㅣ");
    else {
        console.log(`${token.split("-")[0]} | ERR_INVALID_PIN_DELIMITER - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_INVALID_PIN_DELIMITER",
            result: false,
            timeout: Date.now() - now
        });
    }

    if (
        splitPin.length !== 4 ||
        splitPin[0].length !== 4 ||
        splitPin[1].length !== 4 ||
        splitPin[2].length !== 4 ||
        ![4, 6].includes(splitPin[3].length)
    ) {
        console.log(`${token.split("-")[0]} | ERR_INVALID_PIN_LENGTH 1 - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_INVALID_PIN_LENGTH 1",
            result: false,
            timeout: Date.now() - now
        });
    }

    if (splitPin[0].startsWith("41")) {
        if (splitPin[3].length !== 4) {
            console.log(`${token.split("-")[0]} | ERR_INVALID_PIN_LENGTH 2 - ${Date.now() - now}ms`);
            return res.status(400).json({
                amount: 0,
                reason: "ERR_INVALID_PIN_LENGTH 2",
                result: false,
                timeout: Date.now() - now
            });
        }
    }
    else if (!["20", "21", "22", "23", "24", "25", "30", "31", "32", "33", "34", "35", "40", "42", "43", "44", "45", "51", "52", "53", "54", "55"].includes(splitPin[0].substring(0, 2))) {
        console.log(`${token.split("-")[0]} | ERR_INVALID_PIN_PREFIX 1 - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_INVALID_PIN_PREFIX 1",
            result: false,
            timeout: Date.now() - now
        });
    }

    if (splitPin[0].startsWith("41") && !(splitPin[0].startsWith("416") || splitPin[0].startsWith("418"))) {
        console.log(`${token.split("-")[0]} | ERR_INVALID_PIN_PREFIX 2 - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_INVALID_PIN_PREFIX 2",
            result: false,
            timeout: Date.now() - now
        });
    }

    if (splitPin.some(p => Number(p) === NaN)) {
        console.log(`${token.split("-")[0]} | ERR_INVALID_PIN_FORMAT - ${Date.now() - now}ms`);
        return res.status(400).json({
            amount: 0,
            reason: "ERR_INVALID_PIN_FORMAT",
            result: false,
            timeout: Date.now() - now
        });
    }

    const client = new Cultureland();

    const login = await client.login(id, password).catch(err => err);

    if (login.message) {
        console.log(`${token.split("-")[0]} | Login - ${Date.now() - now}ms - ${login.message}`);
        return res.status(500).json({
            amount: 0,
            reason: login.message,
            result: false,
            timeout: Date.now() - now
        });
    }

    if (!login) {
        console.log(`${token.split("-")[0]} | LoginResult - ${Date.now() - now}ms - ${typeof login === "object" ? JSON.stringify(login) : login.toString()}`);
        return res.status(500).json({
            amount: 0,
            reason: typeof login === "object" ? JSON.stringify(login) : login.toString(),
            result: false,
            timeout: Date.now() - now
        });
    }

    const charge = await client.charge(splitPin, false).catch(err => err);

    if (charge.message) {
        console.log(`${token.split("-")[0]} | ChargeMessage - ${Date.now() - now}ms - ${charge.message}`);
        return res.status(500).json({
            amount: 0,
            reason: charge.message,
            result: false,
            timeout: Date.now() - now
        });
    }

    if (!charge.reason) {
        console.log(`${token.split("-")[0]} | ChargeReason - ${Date.now() - now}ms - ${typeof charge === "object" ? JSON.stringify(charge) : charge.toString()}`);
        return res.status(500).json({
            amount: 0,
            reason: typeof charge === "object" ? JSON.stringify(charge) : charge.toString(),
            result: false,
            timeout: Date.now() - now
        });
    }


    console.log(`${token.split("-")[0]} | ChargeSuccess - ${Date.now() - now}ms - ${charge.amount}원 - ${charge.reason.replace("<b>", "").replace("</b>", "")}`);
    return res.status(200).json({
        amount: charge.amount,
        reason: charge.reason.replace("<b>", "").replace("</b>", ""),
        result: !!charge.amount,
        timeout: Date.now() - now
    });
});

app.listen(80, function () {
    console.log("[LOG] Listening on port 80");
});
