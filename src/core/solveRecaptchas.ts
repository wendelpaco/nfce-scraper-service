import { Page } from "../core/puppeteerPlugins";
import { logger } from "../utils/logger";

export async function solvePageCaptchas(page: Page): Promise<{
  solved: boolean;
  error?: string;
}> {
  try {
    // Aguarda o carregamento do CAPTCHA, se visível
    await page.waitForTimeout(3000); // ajustável conforme necessário

    const result = await page.solveRecaptchas();
    logger.info("🔍 Resultado solveRecaptchas:", result);

    if (result.error) {
      logger.warn("⚠️ Erro ao resolver captcha:", result.error);
      return { solved: false, error: result.error };
    }

    if (result.solved.length > 0) {
      logger.info(
        `✅ ${result.solved.length} reCAPTCHA(s) resolvido(s) com sucesso.`,
      );
      return { solved: true };
    } else {
      logger.info("ℹ️ Nenhum reCAPTCHA detectado na página.");
      return { solved: false };
    }
  } catch (err: any) {
    logger.warn("⚠️ Erro inesperado ao tentar resolver captcha:", err.message);
    return { solved: false, error: err.message };
  } finally {
    logger.info(
      "📄 HTML após tentativa de resolver captcha:",
      await page.content(),
    );
  }
}
