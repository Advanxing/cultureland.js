import Cultureland from "./cultureland.js";

const client = new Cultureland();
await client.login("ID", "PW").then(console.log).catch(console.error);
await client.getBalance().then(console.log).catch(console.error);
await client.charge(["0000", "0000", "0000", "000000"], false).then(console.log).catch(console.error);
// await client.checkPin("000000000000000000").then(console.log).catch(console.error);