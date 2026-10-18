import card from '@/assets/investico-business-card.png.asset.json';
import qr from '@/assets/investico-qr-code.png.asset.json';
import brochure from '@/assets/investico-brochure.pdf.asset.json';

export const PLATFORM_HOME_URL = 'https://investicoacademy.lovable.app/';
export const SHARE_DOWNLOADS = [
  { id: 'card', title: 'QR Code on Card', detail: 'Branded, printable business card', filename: 'Investico-Academy-Business-Card.png', url: card.url, type: 'image/png' },
  { id: 'pdf', title: 'QR Code on PDF', detail: 'Downloadable, print-ready brochure', filename: 'Investico-Academy-Brochure.pdf', url: brochure.url, type: 'application/pdf' },
  { id: 'qr', title: 'QR Code on PNG', detail: 'High-quality QR image for WhatsApp', filename: 'Investico-Academy-QR-Code.png', url: qr.url, type: 'image/png' },
] as const;
