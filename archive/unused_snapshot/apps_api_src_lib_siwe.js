import { verifyMessage } from 'viem';

export function extractField(message, label) {
  const line = String(message || '').split('\n').find((item) => item.startsWith(`${label}:`));
  return line ? line.slice(label.length + 1).trim() : null;
}

export function extractAddress(message) {
  const lines = String(message || '').split('\n');
  return lines.length > 1 ? lines[1].trim() : null;
}

export async function verifyWalletSignature({ address, message, signature }) {
  return verifyMessage({ address, message, signature });
}
