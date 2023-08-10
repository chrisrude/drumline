declare module 'base-emoji';

declare function toUtf8(buf: Buffer): string;
declare function toNames(buf: Buffer): string;
declare function toCustom(buf: Buffer, fn: (uint8: number, text: string) => string): string;
declare function fromUnicode(text: string): string;
declare function getSymbols(text: string): string[];
