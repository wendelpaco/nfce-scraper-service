/* eslint-disable no-console */
import axios from "axios";

const urls = [
  "http://nfe.sefaz.ba.gov.br/servicos/nfce/qrcode.aspx?p=29241202125266002725650020000915241002136918|2|1|4|44AC09973E646BA758913A3B7E77E664247292B2",
  // "https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode?p=33250533381286007598650010003779831001296437|2|1|3|96B4DAAB97700B18EF7B0DC4F5D1FADF99154292",
  // "http://www4.fazenda.rj.gov.br/consultaNFCe/QRCode?p=33250517261661003199650010002887021079492748|2|1|3|F51834F834429A75AD83ED955ABFE91BE596E2A2",
  // "https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode?p=33250533381286007598650110002489881011583725|2|1|3|9AEE97C9C4C51337F4D79669F601DA2B96C75FDF",
  // "https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode?p=33250646237314000103650050000721161006530134|2|1|1|01cc2ae20b4a2d5725916af263de255fb04b247a",
  // "https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode?p=33250429911559000902650030007895841007761990|2|1|2|4B7BAF6BB5FE42A686DDE6267D16CBDB17E9D3D4",
  // "https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode?p=33250533381286007598650010003779831001296437|2|1|3|96B4DAAB97700B18EF7B0DC4F5D1FADF99154292",
];

async function queueJobs() {
  for (const url of urls) {
    console.log(`⏳ Enfileirando jobs para URL: ${url}`);
    for (let i = 0; i < 20; i++) {
      try {
        const response = await axios.post("http://localhost:3000/queue", {
          url,
          webhookUrl: "https://attractive-woman-75.webhook.cool",
        });
        console.log(`✅ Job ${i + 1} para essa URL:`, response.data);
      } catch (error) {
        console.error(
          `❌ Erro no Job ${i + 1} para essa URL:`,
          (error as Error).message,
        );
      }
    }
  }

  console.log("🏁 Todos os jobs enviados.");
}

queueJobs().catch((err) => {
  console.error("❌ Erro geral no stress test:", err);
});
