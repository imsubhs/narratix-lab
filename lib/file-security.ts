import { sanitizeTextForAi } from './security';

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const DOCUMENT_RULES = {
  '.pdf': {
    mimes: new Set(['application/pdf']),
    signatures: [Buffer.from('%PDF')],
  },
  '.docx': {
    mimes: new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    signatures: [Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from([0x50, 0x4b, 0x05, 0x06]), Buffer.from([0x50, 0x4b, 0x07, 0x08])],
  },
  '.txt': {
    mimes: new Set(['text/plain']),
    signatures: [],
  },
  '.md': {
    mimes: new Set(['text/markdown', 'text/plain']),
    signatures: [],
  },
} as const;

const AVATAR_RULES = {
  '.jpg': {
    mimes: new Set(['image/jpeg']),
    signatures: [Buffer.from([0xff, 0xd8, 0xff])],
  },
  '.jpeg': {
    mimes: new Set(['image/jpeg']),
    signatures: [Buffer.from([0xff, 0xd8, 0xff])],
  },
  '.png': {
    mimes: new Set(['image/png']),
    signatures: [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  },
  '.webp': {
    mimes: new Set(['image/webp']),
    signatures: [Buffer.from('RIFF')],
  },
} as const;

function getExtension(fileName: string) {
  const cleanName = sanitizeFileName(fileName);
  const dotIndex = cleanName.lastIndexOf('.');
  return dotIndex >= 0 ? cleanName.slice(dotIndex).toLowerCase() : '';
}

function hasSignature(buffer: Buffer, signatures: Buffer[]) {
  if (signatures.length === 0) return true;
  return signatures.some((signature) =>
    buffer.length >= signature.length &&
    buffer.subarray(0, signature.length).equals(signature)
  );
}

function looksLikeText(buffer: Buffer) {
  if (buffer.includes(0)) return false;
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  const replacementChars = sample.toString('utf8').match(/\uFFFD/g)?.length ?? 0;
  return replacementChars <= 2;
}

export function sanitizeFileName(fileName: string) {
  return fileName
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^a-zA-Z0-9._ -]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'upload';
}

export async function readFileBuffer(file: File) {
  const bytes = await file.arrayBuffer();
  return Buffer.from(bytes);
}

export function validateDocumentUpload(file: File, buffer: Buffer) {
  const fileName = sanitizeFileName(file.name);
  const ext = getExtension(fileName);
  const rule = DOCUMENT_RULES[ext as keyof typeof DOCUMENT_RULES];

  if (!rule) {
    throw new Error('Invalid file extension. Only PDF, DOCX, TXT, and MD files are supported.');
  }

  if (file.size <= 0) {
    throw new Error('The uploaded file is empty.');
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed size is 10MB.`);
  }

  if (file.type && !rule.mimes.has(file.type)) {
    throw new Error(`Invalid MIME type for ${ext.toUpperCase().slice(1)} upload.`);
  }

  if (!hasSignature(buffer, [...rule.signatures])) {
    throw new Error(`Invalid ${ext.toUpperCase().slice(1)} file signature.`);
  }

  if ((ext === '.txt' || ext === '.md') && !looksLikeText(buffer)) {
    throw new Error('Text upload contains binary data and was rejected.');
  }

  return {
    safeName: fileName,
    extension: ext,
    mime: file.type || 'application/octet-stream',
    size: file.size,
  };
}

export function validateAvatarUpload(file: File) {
  const fileName = sanitizeFileName(file.name);
  const ext = getExtension(fileName);
  const rule = AVATAR_RULES[ext as keyof typeof AVATAR_RULES];

  if (!rule) {
    throw new Error('Avatar must be JPG, PNG, or WebP.');
  }

  if (file.size <= 0) {
    throw new Error('Avatar file is empty.');
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Image must be under 2MB.');
  }

  if (file.type && !rule.mimes.has(file.type)) {
    throw new Error('Avatar MIME type does not match the selected file.');
  }

  return { safeName: fileName, extension: ext };
}

export function sanitizeExtractedText(text: string) {
  return sanitizeTextForAi(text, 30000);
}
