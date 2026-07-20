import type { NextFunction, Response, Request } from "express";

export async function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  console.log(error);
  return res.status(500).json({"nao": "falhou"})
}