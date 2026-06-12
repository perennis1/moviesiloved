import { Router } from "express";

const router = Router();

router.get("/session", (_request, response) => {
  response.status(410).json({
    error: "Session endpoints are deprecated. Use Clerk authentication instead."
  });
});

export default router;
