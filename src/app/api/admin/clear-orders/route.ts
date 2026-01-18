// Admin utility to clear test data
// DELETE /api/admin/clear-orders
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = await getDb();

        // Delete all sell orders
        const result = await db.collection('sellOrders').deleteMany({});

        console.log('Cleared sellOrders:', result.deletedCount);

        return NextResponse.json({
            success: true,
            message: `Deleted ${result.deletedCount} sell orders`,
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        console.error('Clear orders error:', error);
        return NextResponse.json(
            { error: 'Failed to clear orders' },
            { status: 500 }
        );
    }
}
