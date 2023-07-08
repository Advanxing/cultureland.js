import axios from "axios";
import Jimp from "jimp";
import { chromium } from "playwright-core";

async function login(id, pw, apiKey) {
    const browser = await chromium.launch();

    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        page.goto("https://m.cultureland.co.kr/mmb/loginMain.do");

        const botDetectCaptcha = await page.waitForResponse(/https:\/\/m\.cultureland\.co\.kr\/botdetectcaptcha\?get=image&c=cultureCaptcha&t=*/).then(res => res.body());

        let captchaTask = await axios.post(`http://2captcha.com/in.php?key=${apiKey}&method=base64&min_len=5&max_len=5&json=1`, {
            body: Buffer.from(botDetectCaptcha).toString("base64")
        }).then(res => res.data);

        if (captchaTask.status !== 1)
            return { success: false, data: captchaTask.request };

        const taskId = captchaTask.request;

        page.fill("#txtUserId", id);
        page.evaluate('document.getElementById("chkKeepLogin").click()');

        const transkeyLowerResponse = await page.waitForResponse(/https:\/\/m\.cultureland\.co\.kr\/transkeyServlet\?op=getKey&name=passwd&keyType=lower&keyboardType=qwertyMobile&fieldType=password&inputName=passwd&parentKeyboard=false&transkeyUuid=[\d\w]+&exE2E=false&TK_requestToken=\d+&allocationIndex=\d+&keyIndex=[\d\w]+&initTime=[\d-]+/);

        const transkeyLower = await transkeyLowerResponse.body().then(Jimp.read);
        const transkeySpecial = await Jimp.read(transkeyLowerResponse.url().replace("lower", "special"));

        const lowerBase = "1234567890qwertyuiopasdfghjkl zxcvbnm  ".split("");
        const lowerKeys = [];

        let keyIndex = 0;
        for (var y = 0; y < 4; y++) {
            const yBase = ((y * 2) + 1) * (transkeyLower.getHeight() / (5 * 2));
            for (var x = 0; x < 11; x++) {
                const xBase = ((x * 2) + 1) * (transkeyLower.getWidth() / (11 * 2));
                const key = transkeyLower.clone().crop(Math.floor(xBase) - 12, Math.floor(yBase) - 12, 24, 24);

                const isBlank = key.bitmap.data.every(pixel => pixel === 0);
                if (isBlank)
                    lowerKeys.push(" ");
                else {
                    lowerKeys.push(lowerBase[keyIndex]);
                    keyIndex++;
                }
            }
        }

        const specialBase = "`~!@#$%^&*()-_=+[{]}\\|;:/?,<. >'\"+-*/  ".split("");
        const specialKeys = [];

        keyIndex = 0;
        for (var y = 0; y < 4; y++) {
            const yBase = ((y * 2) + 1) * (transkeySpecial.getHeight() / (5 * 2));
            for (var x = 0; x < 11; x++) {
                const xBase = ((x * 2) + 1) * (transkeySpecial.getWidth() / (11 * 2));
                const key = transkeySpecial.clone().crop(Math.floor(xBase) - 12, Math.floor(yBase) - 18, 24, 36);

                const isBlank = key.bitmap.data.every(pixel => pixel === 0);
                if (isBlank)
                    specialKeys.push(" ");
                else {
                    specialKeys.push(specialBase[keyIndex]);
                    keyIndex++;
                }
            }
        }

        await page.click("#passwd");

        const keys = await page.locator(".dv_transkey_div2").all();
        const extraKeys = await page.locator(".dv_transkey_div3").all();

        let charIndex = 0;
        for (var char of pw.split("")) {
            if (specialBase.includes(char)) {
                await extraKeys[0].click();
                await keys[specialKeys.indexOf(char)].click();
                if (charIndex < 11)
                    await extraKeys[0].click();
            }
            else if (char === char.toLowerCase()) {
                await keys[lowerKeys.indexOf(char)].click();
            }
            else if (char === char.toUpperCase()) {
                await keys[33].click();
                await keys[lowerKeys.indexOf(char)].click();
                if (charIndex < 11)
                    await keys[33].click();
            }
            else
                return { success: false, data: "UNKNOWN_CHAR_" + char };

            charIndex++;
        }

        if (pw.length < 12)
            await extraKeys[2].click();

        captchaTask = await axios.get(`https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`).then(res => res.data);
        while (captchaTask.request === "CAPCHA_NOT_READY") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            captchaTask = await axios.get(`https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`).then(res => res.data);
        }

        if (captchaTask.status !== 1)
            return { success: false, data: captchaTask.request };

        await page.type("#captchaCode", captchaTask.request);
        page.click("#btnLogin");

        const loginProcess = await page.waitForResponse("https://m.cultureland.co.kr/mmb/loginProcess.do");

        switch (loginProcess.status()) {
            case 200: {
                const responseBody = await loginProcess.text();
                if (responseBody.includes("loginErrMsg")) {
                    const errorMsg = responseBody.split("frmRedirect")[1].split("</form>")[0].split('"');
                    return { success: false, data: `[${errorMsg[16]}] ${errorMsg[22]}` };
                }
                return { success: false, data: "LOGINPROCESS_STATUS_" + loginProcess.status() };
            }
            case 302:
                break;
            default:
                return { success: false, data: "LOGINPROCESS_STATUS_" + loginProcess.status() };
        }

        const loginHeaders = await loginProcess.allHeaders();

        browser.close();

        return { success: loginHeaders["set-cookie"].includes("KeepLoginConfig="), data: loginHeaders["set-cookie"].split("KeepLoginConfig=")[1].split(";")[0] };
    }
    catch (err) {
        browser.close();
        return { success: false, data: err.toString() };
    }
}

login("ID", "PW", "CAPTCHA_KEY").then(console.log);
