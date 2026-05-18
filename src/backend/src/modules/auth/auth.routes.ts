import { Router, Request, Response } from "express";

const r = Router();

r.get("/login", (req: Request, res: Response) => {
    res.status(200).json({ message: "not implemented" });
});

export default r;
