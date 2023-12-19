import clipboardy from 'clipboardy';
import cheerio from 'cheerio';
const $ = cheerio.load(clipboardy.readSync());
const cashChargeAmtValue = $('#cashChargeAmt').val()
console.log(cashChargeAmtValue)