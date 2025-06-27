import {
  filterLinesWithPParam,
  formatLinesWithQuotes,
  formatLinesWithQuotesAndComma,
} from "./utils";

// Exemplo prático: como formatar URLs com aspas duplas

console.log("=== Exemplo de Formatação de URLs ===\n");

// Dados de exemplo
const textoExemplo = `
http://nfe.sefaz.ba.gov.br/servicos/nfce/qrcode.aspx?p=29241202125266002725650020000915241002136918|2|1|4|44AC09973E646BA758913A3B7E77E664247292B2
http://nfe.sefaz.ba.gov.br/servicos/nfce/qrcode.aspx?p=29241210230480000300650020136235011177844445|2|1|1|47A9E1E679E08F8E41B6A7076CDA63098E733364
http://exemplo.com/sem-parametro
http://nfe.sefaz.ba.gov.br/servicos/nfce/modulos/geral/NFCEC_consulta_chave_acesso.aspx?p=29241232861740000109655020001359471842477590|2|1|2|00702ff50326f7c7cf91ac1da44d3d63fa63bcf2
linha vazia

http://outro-exemplo.com?p=123456
`;

// 1. Filtrar linhas com ?p=
console.log("1. Filtrando linhas com parâmetro ?p=:");
const urlsFiltradas = filterLinesWithPParam(textoExemplo);
console.log(`Encontradas ${urlsFiltradas.length} URLs válidas\n`);

// 2. Formatar com aspas duplas e vírgula em todas as linhas
console.log("2. Formatação com aspas duplas e vírgula (todas as linhas):");
const urlsComVirgula = formatLinesWithQuotes(urlsFiltradas);
urlsComVirgula.forEach((url, index) => {
  console.log(`  ${index + 1}. ${url}`);
});
console.log("");

// 3. Formatar para arrays JavaScript (última linha sem vírgula)
console.log("3. Formatação para arrays JavaScript (última linha sem vírgula):");
const urlsParaArray = formatLinesWithQuotesAndComma(urlsFiltradas);
urlsParaArray.forEach((url, index) => {
  console.log(`  ${index + 1}. ${url}`);
});
console.log("");

// 4. Exemplo de como usar em código
console.log("4. Como usar em seu código:");
console.log("const minhasUrls = [");
urlsParaArray.forEach((url, index) => {
  console.log(`  ${url}`);
});
console.log("];");
console.log("");

// 5. Exemplo de como processar um arquivo
console.log("5. Para processar um arquivo:");
console.log(`
import { processFileWithPParam, formatLinesWithQuotesAndComma } from './utils';

async function processarArquivo() {
  const urls = await processFileWithPParam('./meu-arquivo.txt');
  const urlsFormatadas = formatLinesWithQuotesAndComma(urls);
  
  console.log('const urls = [');
  urlsFormatadas.forEach(url => console.log(\`  \${url}\`));
  console.log('];');
}
`);

console.log("✅ Processo concluído!");
