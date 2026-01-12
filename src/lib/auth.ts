// NextAuth Configuration
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDb } from './mongodb';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

// User types in the system
export type UserType = 'SUPPLIER' | 'BUYER' | 'INVESTOR' | 'ADMIN';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      userType: UserType;
      walletAddress?: string | null;
      kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    };
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    userType: UserType;
    walletAddress?: string | null;
    kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    userType: UserType;
    walletAddress?: string | null;
    kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  }
}

export const authOptions: NextAuthOptions = {
  // Using JWT strategy - no adapter needed for session storage
  // User data is stored in MongoDB via our custom logic
  
  providers: [
    // Email/Password for Buyers
    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const db = await getDb();
        const user = await db.collection('users').findOne({ 
          email: credentials.email.toLowerCase() 
        });

        if (!user) {
          throw new Error('No user found with this email');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          userType: user.userType,
          walletAddress: user.walletAddress,
          kycStatus: user.kycStatus || 'PENDING',
        };
      },
    }),

    // Wallet Auth for Suppliers/Investors
    CredentialsProvider({
      id: 'wallet',
      name: 'Wallet',
      credentials: {
        walletAddress: { label: 'Wallet Address', type: 'text' },
        signature: { label: 'Signature', type: 'text' },
        nonce: { label: 'Nonce', type: 'text' },
        userType: { label: 'User Type', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.walletAddress || !credentials?.signature || !credentials?.nonce) {
          throw new Error('Wallet address, signature, and nonce required');
        }

        const db = await getDb();
        
        // Verify nonce exists and hasn't expired
        const nonceDoc = await db.collection('nonces').findOne({
          walletAddress: credentials.walletAddress,
          nonce: credentials.nonce,
          expiresAt: { $gt: new Date() },
        });

        if (!nonceDoc) {
          throw new Error('Invalid or expired nonce');
        }

        // Get the userType from the nonce document or credentials
        const userType = credentials.userType || nonceDoc.userType || 'INVESTOR';

        // TODO: Verify Stellar signature
        // For now, we trust the signature (implement proper verification)
        // const isValidSignature = verifySignature(credentials.walletAddress, credentials.nonce, credentials.signature);

        // Delete used nonce
        await db.collection('nonces').deleteOne({ _id: nonceDoc._id });

        // Find or create user
        let user = await db.collection('users').findOne({ 
          walletAddress: credentials.walletAddress 
        });

        if (!user) {
          // Create new user for wallet with the selected userType
          const result = await db.collection('users').insertOne({
            walletAddress: credentials.walletAddress,
            userType: userType,
            kycStatus: null, // Not submitted yet
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          user = {
            _id: result.insertedId,
            walletAddress: credentials.walletAddress,
            userType: userType,
            kycStatus: null,
          };
        } else {
          // Update userType if different (user might be logging in with different role)
          if (user.userType !== userType) {
            await db.collection('users').updateOne(
              { _id: user._id },
              { $set: { userType: userType, updatedAt: new Date() } }
            );
            user.userType = userType;
          }
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          userType: user.userType,
          walletAddress: user.walletAddress,
          kycStatus: user.kycStatus || 'PENDING',
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.userType = user.userType;
        token.walletAddress = user.walletAddress;
        token.kycStatus = user.kycStatus;
      }
      
      // Refresh KYC status from database on each request
      // This ensures KYC approval is reflected immediately
      if (token.id) {
        try {
          const db = await getDb();
          const dbUser = await db.collection('users').findOne({ 
            _id: new ObjectId(token.id) 
          });
          if (dbUser) {
            token.kycStatus = dbUser.kycStatus || null;
          }
        } catch (error) {
          console.error('Failed to refresh KYC status:', error);
        }
      }
      
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.userType = token.userType;
        session.user.walletAddress = token.walletAddress;
        session.user.kycStatus = token.kycStatus;
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  events: {
    async createUser({ user }) {
      console.log('New user created:', user.id);
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

// Helper to get user by ID
export async function getUserById(userId: string) {
  const db = await getDb();
  return db.collection('users').findOne({ _id: new ObjectId(userId) });
}

// Helper to update user
export async function updateUser(userId: string, data: Record<string, unknown>) {
  const db = await getDb();
  return db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: { ...data, updatedAt: new Date() } }
  );
}
