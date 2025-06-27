import { Page } from "../core/puppeteerPlugins";
/* eslint-disable no-console */
export async function solvePageCaptchas(page: Page): Promise<{
  solved: boolean;
  error?: string;
}> {
  try {
    // Aguarda o carregamento do CAPTCHA, se visível
    await page.waitForTimeout(3000); // ajustável conforme necessário

    const result = await page.solveRecaptchas();
    console.log("🔍 Resultado solveRecaptchas:", result);

    if (result.error) {
      console.warn("⚠️ Erro ao resolver captcha:", result.error);
      return { solved: false, error: result.error };
    }

    if (result.solved.length > 0) {
      console.log(
        `✅ ${result.solved.length} reCAPTCHA(s) resolvido(s) com sucesso.`,
      );
      return { solved: true };
    } else {
      console.log("ℹ️ Nenhum reCAPTCHA detectado na página.");
      return { solved: false };
    }
  } catch (err: any) {
    console.warn("⚠️ Erro inesperado ao tentar resolver captcha:", err.message);
    return { solved: false, error: err.message };
  } finally {
    console.log(
      "📄 HTML após tentativa de resolver captcha:",
      await page.content(),
    );
  }
}
