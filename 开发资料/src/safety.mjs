import { lstatSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { pathKey } from './paths.mjs';

export const MAX_FILE_BYTES = 32 * 1024 * 1024;
export const MAX_BODY_BYTES = 64 * 1024 * 1024;
export const MAX_NAME_BYTES = 120;

const RESERVED = new Set([
  'CON','PRN','AUX','NUL',
  ...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`),
]);
const ILLEGAL = /[\\/:*?"<>|\u0000-\u001f]/;

export class SafetyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SafetyError';
    this.status = 400;
  }
}

/** 校验「一个名字」：用于 Mod 名、人格名之外的文件夹/文件名 */
export function cleanName(raw, field = '名称') {
  const name = String(raw ?? '').trim();
  if (!name) throw new SafetyError(`${field}不能为空`);
  if (name === '.' || name === '..') throw new SafetyError(`${field}不合法：${name}`);
  if (ILLEGAL.test(name)) throw new SafetyError(`${field}含有非法字符（\\ / : * ? " < > | 或控制字符）`);
  if (/[. ]$/.test(name)) throw new SafetyError(`${field}不能以空格或句点结尾`);
  const base = name.split('.')[0].toUpperCase();
  if (RESERVED.has(base)) throw new SafetyError(`${field}不能使用 Windows 保留名：${base}`);
  if (Buffer.byteLength(name, 'utf8') > MAX_NAME_BYTES) {
    throw new SafetyError(`${field}过长（最多 ${MAX_NAME_BYTES} 字节）`);
  }
  return name;
}

/** 校验相对路径：返回 posix 形式；拒绝绝对路径、盘符、..、保留名 */
export function safeRel(rel, field = '路径') {
  const raw = String(rel ?? '').replace(/\\/g, '/');
  if (!raw) throw new SafetyError(`${field}不能为空`);
  if (raw.startsWith('/') || /^[a-zA-Z]:/.test(raw)) throw new SafetyError(`${field}必须是相对路径`);
  const parts = raw.split('/').filter((s) => s !== '');
  if (!parts.length) throw new SafetyError(`${field}不能为空`);
  for (const part of parts) {
    if (part === '.' || part === '..') throw new SafetyError(`${field}不能包含 . 或 ..`);
    if (ILLEGAL.test(part)) throw new SafetyError(`${field}含有非法字符`);
    if (/[. ]$/.test(part)) throw new SafetyError(`${field}的片段不能以空格或句点结尾`);
    const base = part.split('.')[0].toUpperCase();
    if (RESERVED.has(base)) throw new SafetyError(`${field}包含 Windows 保留名：${base}`);
  }
  return parts.join('/');
}

export function isInside(base, abs) {
  const b = pathKey(base);
  const a = pathKey(abs);
  return a === b || a.startsWith(b + '/');
}

/** 把相对路径解析到 base 之下，并保证结果仍在 base 内部 */
export function resolveInside(base, rel, field = '路径') {
  const clean = safeRel(rel, field);
  const abs = resolve(base, ...clean.split('/'));
  if (!isInside(base, abs)) throw new SafetyError(`${field}越出了允许的目录范围`);
  return abs;
}

/** 逐段 lstat，拒绝符号链接 / junction（Windows 上的目录联接会绕过 isInside 的直觉） */
export function assertNoLink(abs, base) {
  const rel = relative(base, abs);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new SafetyError('目标越界');
  const segs = rel.split(sep).filter(Boolean);
  let cur = base;
  for (const seg of segs) {
    cur = resolve(cur, seg);
    try {
      const st = lstatSync(cur);
      if (st.isSymbolicLink()) throw new SafetyError(`路径中包含符号链接，已拒绝：${seg}`);
    } catch (err) {
      if (err instanceof SafetyError) throw err;
      if (err && err.code === 'ENOENT') return;
      throw err;
    }
  }
}

export function assertBodyBudget(buf) {
  const size = Buffer.isBuffer(buf) ? buf.length : Buffer.byteLength(String(buf ?? ''));
  if (size > MAX_BODY_BYTES) throw new SafetyError('请求体过大');
  return size;
}