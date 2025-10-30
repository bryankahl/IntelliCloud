/** UTF-8 helpers for Base64 */
function u8ToBase64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}
function base64ToU8(b64) {
  const s = atob(b64);
  const arr = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
  return arr;
}

/** HEX */
function toHex(str) {
  const enc = new TextEncoder().encode(str);
  return Array.from(enc).map(b => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex) {
  const clean = hex.replace(/[^0-9a-f]/gi, '');
  if (clean.length % 2 !== 0) throw new Error('Invalid hex length');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i/2] = parseInt(clean.slice(i, i+2), 16);
  }
  return new TextDecoder().decode(bytes);
}

/** Base64 */
function toBase64(str) {
  const u8 = new TextEncoder().encode(str);
  return u8ToBase64(u8);
}
function fromBase64(b64) {
  const u8 = base64ToU8(b64.trim());
  return new TextDecoder().decode(u8);
}

/** ROT13 (letters only) */
function rot13(str) {
  return str.replace(/[A-Za-z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

/** Atbash (A<->Z, a<->z) */
function atbash(str) {
  return str.replace(/[A-Za-z]/g, c => {
    const code = c.charCodeAt(0);
    if (c >= 'A' && c <= 'Z') return String.fromCharCode(155 - code); // 65+90=155
    if (c >= 'a' && c <= 'z') return String.fromCharCode(219 - code); // 97+122=219
    return c;
  });
}

/** Morse */
const MORSE_MAP = {
  A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....',
  I:'..', J:'.---', K:'-.-', L:'.-..', M:'--', N:'-.', O:'---', P:'.--.',
  Q:'--.-', R:'.-.', S:'...', T:'-', U:'..-', V:'...-', W:'.--', X:'-..-',
  Y:'-.--', Z:'--..', 0:'-----', 1:'.----', 2:'..---', 3:'...--', 4:'....-',
  5:'.....', 6:'-....', 7:'--...', 8:'---..', 9:'----.', ' ':'/'
};
const REV_MORSE = Object.fromEntries(Object.entries(MORSE_MAP).map(([k,v]) => [v,k]));

function toMorse(str) {
  return str.toUpperCase().split('').map(ch => MORSE_MAP[ch] ?? ch).join(' ');
}
function fromMorse(morse) {
  return morse.trim().split(/\s+/).map(tok => REV_MORSE[tok] ?? (tok === '/' ? ' ' : '?')).join('');
}

/** Rail Fence Cipher */
function railFenceEncode(text, rails=3) {
  rails = Math.max(2, Number(rails) || 2);
  const rows = Array.from({length: rails}, () => []);
  let r = 0, dir = 1;
  for (const ch of text) {
    rows[r].push(ch);
    if (r === 0) dir = 1;
    else if (r === rails-1) dir = -1;
    r += dir;
  }
  return rows.map(row => row.join('')).join('');
}
function railFenceDecode(cipher, rails=3) {
  rails = Math.max(2, Number(rails) || 2);
  const n = cipher.length;
  const pattern = [];
  let r = 0, dir = 1;
  for (let i=0;i<n;i++){
    pattern.push(r);
    if (r===0) dir=1; else if (r===rails-1) dir=-1;
    r+=dir;
  }
  const counts = Array(rails).fill(0);
  pattern.forEach(p => counts[p]++);
  const rows = [];
  let idx = 0;
  for (let i=0;i<rails;i++){
    rows[i] = cipher.slice(idx, idx+counts[i]).split('');
    idx += counts[i];
  }
  const out = [];
  const pos = Array(rails).fill(0);
  for (const p of pattern) out.push(rows[p][pos[p]++]);
  return out.join('');
}

function vigenere(text, key, mode='enc') {
  if (!key) throw new Error('Key required for Vigenère');
  const k = key.replace(/[^A-Za-z]/g,'').toUpperCase();
  if (!k.length) throw new Error('Key must contain letters');
  let j = 0;
  return text.split('').map(ch => {
    const code = ch.charCodeAt(0);
    let base;
    if (code>=65 && code<=90) base=65;
    else if (code>=97 && code<=122) base=97;
    else return ch;

    const shift = k[j % k.length].charCodeAt(0) - 65;
    j++;
    const off = code - base;
    const out = mode === 'enc' ? (off + shift) % 26 : (off - shift + 26) % 26;
    return String.fromCharCode(base + out);
  }).join('');
}


/** Dispatcher */
export function runDecipher({ algo, mode, input, rails, key }) {
  switch (algo) {
    case 'hex':      return mode === 'enc' ? toHex(input) : fromHex(input);
    case 'base64':   return mode === 'enc' ? toBase64(input) : fromBase64(input);
    case 'rot13':    return rot13(input); // same both ways
    case 'atbash':   return atbash(input); // same both ways
    case 'morse':    return mode === 'enc' ? toMorse(input) : fromMorse(input);
    case 'railfence':return mode === 'enc' ? railFenceEncode(input, rails) : railFenceDecode(input, rails);
    case 'vigenere': return vigenere(input, key, mode);
    default: throw new Error('Unknown algorithm');
  }
}
