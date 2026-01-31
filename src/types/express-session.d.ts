export {};

declare module 'express-session' {
  interface SessionData {
    csrfSecret?: string;
    attempts?: number;
  }
}