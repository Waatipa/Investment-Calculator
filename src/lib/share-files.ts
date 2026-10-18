import { PLATFORM_HOME_URL } from '@/lib/platform-share';

export type ShareFiles = Record<'card' | 'pdf' | 'qr', Blob>;

function canvasBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('Unable to create the image.'));
  }, type, 0.96));
}

// Browser-only work: prepare files after hydration so clicks retain user activation.
export async function generateShareFiles(): Promise<ShareFiles> {
  const [QRCode, { jsPDF }] = await Promise.all([import('qrcode'), import('jspdf')]);
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, PLATFORM_HOME_URL, { width: 900, margin: 4, errorCorrectionLevel: 'M' });
  const theme = getComputedStyle(document.documentElement);
  const accent = theme.getPropertyValue('--primary').trim();
  const background = theme.getPropertyValue('--background').trim();
  const foreground = theme.getPropertyValue('--foreground').trim();
  function artwork(width: number, height: number) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image creation is not supported in this browser.');
    ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = accent;
    // Matches the shared AcademyBrand pillar and growth mark.
    ctx.save(); ctx.translate(48, 36); ctx.scale(2.3, 2.3); ctx.lineWidth = 3;
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of [[2,3,26,3],[4,8,24,8],[2,45,26,45],[4,40,24,40],[8,10,8,38],[14,10,14,38],[20,10,20,38]]) {
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    }
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = accent; ctx.font = 'bold 48px Arial'; ctx.fillText('INVESTICO', 136, 82);
    ctx.font = '22px Arial'; ctx.fillText('ACADEMY', 138, 116);
    ctx.save(); ctx.translate(430, 43); ctx.scale(1.6, 1.6); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(2,35); ctx.lineTo(22,25); ctx.lineTo(36,30); ctx.lineTo(66,7);
    ctx.moveTo(51,7); ctx.lineTo(66,7); ctx.lineTo(66,22); ctx.stroke(); ctx.restore();
    return { canvas, ctx };
  }
  const image = artwork(1200, 1430);
  image.ctx.drawImage(qr, 150, 180, 900, 900);
  image.ctx.textAlign = 'center'; image.ctx.fillStyle = foreground;
  image.ctx.font = 'bold 36px Arial'; image.ctx.fillText('Financial education & market tools', 600, 1170);
  image.ctx.font = '32px Arial'; image.ctx.fillText(PLATFORM_HOME_URL, 600, 1240);
  image.ctx.font = '24px Arial'; image.ctx.fillText('Scan to explore Investico Academy', 600, 1300);
  const card = artwork(1800, 1050);
  card.ctx.drawImage(qr, 1120, 175, 600, 600);
  card.ctx.fillStyle = foreground; card.ctx.font = 'bold 48px Arial';
  card.ctx.fillText('Explore. Compare. Understand.', 70, 310);
  card.ctx.font = '32px Arial';
  ['Financial education', 'Historical stock investment calculators', 'Stock comparison & company research'].forEach((line, i) => card.ctx.fillText(line, 70, 430 + i * 70));
  card.ctx.fillStyle = accent; card.ctx.fillText(PLATFORM_HOME_URL, 70, 800);
  card.ctx.fillStyle = foreground; card.ctx.font = '24px Arial';
  card.ctx.fillText('Educational purposes only. Not investment advice.', 70, 925);
  const header = artwork(1200, 160);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  pdf.setProperties({ title: 'Investico Academy | Educational Market Tools', subject: PLATFORM_HOME_URL });
  pdf.addImage(header.canvas.toDataURL('image/png'), 'PNG', 15, 15, 180, 24);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(23);
  pdf.text('Financial Education', 20, 61); pdf.text('& Market Tools', 20, 72);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(12);
  pdf.text(pdf.splitTextToSize('Explore historical stock trends, compare investments and learn the fundamentals of company research with Investico Academy.', 170), 20, 88);
  pdf.addImage(qr.toDataURL('image/png'), 'PNG', 55, 116, 100, 100);
  pdf.setFont('helvetica', 'bold'); pdf.text('Scan to explore Investico Academy', 105, 230, { align: 'center' });
  pdf.setFont('helvetica', 'normal'); pdf.text(PLATFORM_HOME_URL, 105, 241, { align: 'center' });
  pdf.link(55, 116, 100, 100, { url: PLATFORM_HOME_URL });
  pdf.setFontSize(9);
  pdf.text(pdf.splitTextToSize('Educational purposes only. Not investment advice. Past performance does not guarantee future results. Do not invest unless you are willing and ready to.', 170), 20, 266);
  const [qrBlob, cardBlob] = await Promise.all([canvasBlob(image.canvas, 'image/jpeg'), canvasBlob(card.canvas, 'image/png')]);
  return { qr: qrBlob, card: cardBlob, pdf: pdf.output('blob') };
}

export async function deliverShareFile(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Investico Academy' }); return; }
    catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}