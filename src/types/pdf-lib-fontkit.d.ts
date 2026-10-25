declare module '@pdf-lib/fontkit' {
  interface FontkitInstance {
    create: (buffer: Uint8Array, postscriptName?: string) => unknown;
  }

  const fontkit: FontkitInstance;
  export default fontkit;
}
