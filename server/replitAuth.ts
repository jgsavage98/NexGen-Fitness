import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import cookieParser from "cookie-parser";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Extend session type for development
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userEmail?: string;
    authenticated?: boolean;
  }
}

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: true,
    saveUninitialized: true,
    name: 'connect.sid',
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: sessionTtl,
      sameSite: 'lax',
      path: '/',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  
  // Add cookie parser middleware
  app.use(cookieParser());
  
  // Add CORS headers for session cookies
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  
  app.use(getSession());

  // Development mode: create a demo user for testing
  if (process.env.NODE_ENV === 'development') {
    // Simple demo authentication for development using auth token
    app.get("/api/login", async (req, res) => {
      console.log('Login attempt');
      
      // Create or get demo user
      const demoUser = await storage.upsertUser({
        id: "demo-user-123",
        email: "demo@example.com",
        firstName: "Demo",
        lastName: "User",
        profileImageUrl: "https://via.placeholder.com/150",
      });
      
      // Create simple auth token
      const authToken = Buffer.from(`${demoUser.id}:${Date.now()}`).toString('base64');
      
      console.log('Setting auth cookie for user:', demoUser.id);
      
      // Set httpOnly auth cookie
      res.cookie('auth_token', authToken, {
        httpOnly: true,
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax',
        path: '/'
      });
      
      res.redirect('/');
    });

    app.get("/api/logout", (req, res) => {
      (req as any).session.destroy();
      res.redirect('/');
    });

    return;
  }

  // Production mode: use passport for Replit Auth
  app.use(passport.initialize());
  app.use(passport.session());

  // Production mode: use proper Replit Auth
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Development mode: check session-based authentication
  if (process.env.NODE_ENV === 'development') {
    const session = req.session as any;
    const authToken = req.cookies?.auth_token;
    
    console.log('Auth check:', { 
      hasCookie: !!authToken, 
      cookieValue: authToken?.substring(0, 20) + '...',
      path: req.path
    });
    
    // Check cookie-based auth
    if (!authToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      // Decode the auth token
      const decoded = Buffer.from(authToken, 'base64').toString();
      const [userId] = decoded.split(':');
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log('Auth successful for user:', userId);
      
      // Attach user info to request for compatibility
      (req as any).user = {
        claims: {
          sub: userId,
          email: userId === 'coach_chassidy' ? 'chassidy@igniteai.com' : 'demo@example.com',
        }
      };
      return next();
    } catch (error) {
      console.error('Auth token decode error:', error);
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  // Production mode: use passport authentication
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
