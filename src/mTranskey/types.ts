export interface ServletData {
    requestToken: string;
    initTime: string;
    keyInfo: KeyInfo;
}

export interface KeyInfo {
    qwerty: [number, number][];
    number: [number, number][];
}