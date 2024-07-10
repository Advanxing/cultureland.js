import crypto from "crypto";

export function generateRandomInt() { // Replaces GenKey.tk_getrnd_int
    return parseInt(generateRandomHex(4), 16);
}

export function generateRandomHex(bytes: number) { // Replaces GenKey.tk_getrnd_hex
    return crypto.randomBytes(bytes).toString("hex");
}

export function generateRandomKey(bit: number) { // Replaces GenKey.GenerateKey
    return generateRandomHex((bit / 32) * 2);
}