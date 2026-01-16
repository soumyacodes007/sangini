// Buyer Search API - Allows suppliers to find buyers by email or company name
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only suppliers can search for buyers
        if (session.user.userType !== 'SUPPLIER') {
            return NextResponse.json(
                { error: 'Only suppliers can search for buyers' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const email = searchParams.get('email');

        if (!query && !email) {
            return NextResponse.json(
                { error: 'Search query (q) or email parameter required' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Build search criteria
        let searchCriteria: Record<string, unknown>;

        if (email) {
            // Exact email search
            searchCriteria = {
                email: email.toLowerCase(),
                userType: 'BUYER',
            };
        } else {
            // Fuzzy search by email or company name
            searchCriteria = {
                userType: 'BUYER',
                $or: [
                    { email: { $regex: query, $options: 'i' } },
                    { companyName: { $regex: query, $options: 'i' } },
                    { name: { $regex: query, $options: 'i' } },
                ],
            };
        }

        const buyers = await db
            .collection('users')
            .find(searchCriteria)
            .project({
                _id: 1,
                email: 1,
                name: 1,
                companyName: 1,
                custodialPubKey: 1,
                walletAddress: 1,
            })
            .limit(10)
            .toArray();

        // Format response - only expose public info
        const results = buyers.map((buyer) => ({
            id: buyer._id.toString(),
            email: buyer.email,
            name: buyer.name || '',
            companyName: buyer.companyName || '',
            walletAddress: buyer.custodialPubKey || buyer.walletAddress || '',
        }));

        return NextResponse.json({
            success: true,
            buyers: results,
            count: results.length,
        });
    } catch (error) {
        console.error('Buyer search error:', error);
        return NextResponse.json(
            { error: 'Failed to search buyers' },
            { status: 500 }
        );
    }
}
