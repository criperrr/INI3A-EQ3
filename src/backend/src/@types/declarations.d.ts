declare module "compression" {
  import { RequestHandler } from "express";
  interface CompressionOptions {
    level?: number;
    threshold?: number | string;
    filter?: (req: any, res: any) => boolean;
    chunkSize?: number;
    windowBits?: number;
    memLevel?: number;
    strategy?: number;
  }
  function compression(options?: CompressionOptions): RequestHandler;
  namespace compression {
    function filter(req: any, res: any): boolean;
  }
  export default compression;
}

declare module "sharp" {
  const sharp: any;
  export default sharp;
}
