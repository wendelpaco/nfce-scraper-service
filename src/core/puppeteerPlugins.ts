import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import RecaptchaPlugin from "puppeteer-extra-plugin-recaptcha";

puppeteer.use(StealthPlugin());
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: "2captcha",
      token: process.env.API_KEY_2CAPTCHA, // certifique-se de ter isso no seu .env
    },
    visualFeedback: true,
  }),
);

export default puppeteer;
export type { Browser, Page } from "puppeteer";
