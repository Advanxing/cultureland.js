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

        if (!token) {
            console.log(`NO_TOKEN | ERR_TOKEN_REQUIRED - ${Date.now() - req.start}ms`);
            return res.status(400).json({
                amount: 0,
                message: "ERR_TOKEN_REQUIRED",
                success: false,
                timeout: Date.now() - req.start
            });
        };

        if (!tokens.includes(token)) {
            console.log(`${typeof token === "string" ? token.split("-")[0] : "INVALID_TOKEN_TYPE"} | ERR_INVALID_TOKEN - ${Date.now() - req.start}ms`);
            return res.status(400).json({
                amount: 0,
                message: "ERR_INVALID_TOKEN",
                success: false,
                timeout: Date.now() - req.start
            });
        };

        if (typeof id !== "string" || typeof password !== "string" || typeof token !== "string") {
            console.log(`NO_TOKEN | ERR_INVALID_TYPE - ${Date.now() - req.start}ms`);
            return res.status(400).json({
                amount: 0,
                message: "ERR_INVALID_TYPE",
                success: false,
                timeout: Date.now() - req.start
            });
        };

        if (!id.trim() || !password.trim()) {
            console.log(`${token.split("-")[0]} | ERR_LOGIN_REQUIRED - ${Date.now() - req.start}ms`);
            return res.status(400).json({
                amount: 0,
                message: "ERR_LOGIN_REQUIRED",
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

    const login = await client.login(id.trim(), password.trim()).catch(err => err);

    if (login.message) {
        console.log(`${token.split("-")[0]} | Login - ${Date.now() - req.start}ms - ${login.message}`);
        return res.status(500).json({
            amount: 0,
            message: login.message,
            success: false,
            timeout: Date.now() - req.start
        });
    };

    if (!login) {
        console.log(`${token.split("-")[0]} | LoginResult - ${Date.now() - req.start}ms - ${typeof login === "object" ? JSON.stringify(login) : login.toString()}`);
        return res.status(500).json({
            amount: 0,
            message: typeof login === "object" ? JSON.stringify(login) : login.toString(),
            success: false,
            timeout: Date.now() - req.start
        });
    };

    const balance = await client.getBalance().catch(err => err);

    if (balance.message) {
        console.log(`${token.split("-")[0]} | BalanceMessage - ${Date.now() - req.start}ms - ${balance.message}`);
        return res.status(500).json({
            amount: 0,
            message: balance.message,
            success: false,
            timeout: Date.now() - req.start
        });
    };

    console.log(`${token.split("-")[0]} | BalanceSuccess - ${Date.now() - req.start}ms - ${balance.myCash}원 - ${JSON.stringify(balance)}`);
    return res.status(200).json({
        ...balance,
        amount: balance.myCash,
        message: "OK",
        success: true,
        timeout: Date.now() - req.start
    });
});

app.post("/charge", async function (req, res) {
    const { id, password, pin, token } = req.body;

    const pinResult = Cultureland.checkPinFormat(pin);
    if (!pinResult.success) {
        console.log(`${token.split("-")[0]} | ${pinResult.message} - ${Date.now() - req.start}ms`);
        return res.status(400).json({
            success: false,
            message: pinResult.message,
            amount: 0,
            timeout: Date.now() - req.start
        });
    };

    const client = new Cultureland();

    const login = await client.login(id.trim(), password.trim()).catch(err => err);

    if (login.message) {
        console.log(`${token.split("-")[0]} | Login - ${Date.now() - req.start}ms - ${login.message}`);
        return res.status(500).json({
            success: false,
            message: login.message,
            amount: 0,
            timeout: Date.now() - req.start
        });
    };

    if (!login) {
        console.log(`${token.split("-")[0]} | LoginResult - ${Date.now() - req.start}ms - ${typeof login === "object" ? JSON.stringify(login) : login.toString()}`);
        return res.status(500).json({
            success: false,
            message: typeof login === "object" ? JSON.stringify(login) : login.toString(),
            amount: 0,
            timeout: Date.now() - req.start
        });
    };

    const charge = await client.charge(pinResult.pinParts, false).catch(err => err);

    if (charge.message) {
        console.log(`${token.split("-")[0]} | ChargeMessage - ${Date.now() - req.start}ms - ${charge.message}`);
        return res.status(500).json({
            success: false,
            message: charge.message,
            amount: 0,
            timeout: Date.now() - req.start
        });
    };

    if (!charge.reason) {
        console.log(`${token.split("-")[0]} | ChargeReason - ${Date.now() - req.start}ms - ${typeof charge === "object" ? JSON.stringify(charge) : charge.toString()}`);
        return res.status(500).json({
            success: false,
            message: typeof charge === "object" ? JSON.stringify(charge) : charge.toString(),
            amount: 0,
            timeout: Date.now() - req.start
        });
    };

    console.log(`${token.split("-")[0]} | ChargeSuccess - ${Date.now() - req.start}ms - ${charge.amount}원 - ${charge.reason.replace("<b>", "").replace("</b>", "")}`);
    return res.status(200).json({
        success: !!charge.amount,
        message: charge.reason.replace("<b>", "").replace("</b>", ""),
        amount: charge.amount,
        timeout: Date.now() - req.start
    });
});

app.use(function (error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) {
    console.error("Web Server ERROR!", error);
    res.status(500).json({ success: false, message: "Internal Server Error. Please try again later.", amount: 0, timeout: Date.now() - req.start });
});

app.listen(3002, function () {
    console.log("[LOG] Listening on port 3002");
});