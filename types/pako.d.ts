declare module 'pako' {
  export function ungzip(data: Uint8Array): Uint8Array;
  export function inflate(data: Uint8Array): Uint8Array;
}

