// Augment Express Request to include userId set by middleware
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
