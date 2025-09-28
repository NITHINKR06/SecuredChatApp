import { SessionData } from 'express-session';

declare module 'express-session' {
  interface SessionData {
    registrationChallenge?: string;
    registrationEmail?: string;
    registrationUsername?: string;
    registrationDisplayName?: string;
    loginChallenge?: string;
    loginEmail?: string;
  }
}
