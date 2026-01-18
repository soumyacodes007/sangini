// Risk Scoring API - Integrates with Weilliptic Agent
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Weilliptic API endpoint
const WEILLIPTIC_API = process.env.WEILLIPTIC_API_URL || 'https://api.weilliptic.ai';
const RISK_AGENT_ID = process.env.WEILLIPTIC_RISK_AGENT_ID;

interface RiskScore {
  invoice_id: string;
  overall_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  counterparty_risk: number;
  financial_risk: number;
  verification_risk: number;
  timing_risk: number;
  market_risk: number;
  recommended_action: string;
  warnings: string[];
  calculated_at: number;
  agent_version: string;
}

// POST /api/risk/score - Calculate risk score for an invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID required' },
        { status: 400 }
      );
    }

    // Check if invoice exists
    const db = await getDb();
    
    // Build query based on whether invoiceId is a valid ObjectId
    const query = ObjectId.isValid(invoiceId)
      ? {
          $or: [
            { _id: new ObjectId(invoiceId) },
            { invoiceId: invoiceId },
            { onChainId: invoiceId },
          ],
        }
      : {
          $or: [
            { invoiceId: invoiceId },
            { onChainId: invoiceId },
          ],
        };
    
    const invoice = await db.collection('invoices').findOne(query);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Use onChainId for risk scoring (agent reads from Stellar)
    const contractInvoiceId = invoice.onChainId || invoice.invoiceId;

    // Call Weilliptic Risk Scoring Agent
    let riskScore: RiskScore;

    if (RISK_AGENT_ID) {
      try {
        const response = await fetch(`${WEILLIPTIC_API}/invoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WEILLIPTIC_API_KEY}`,
          },
          body: JSON.stringify({
            applet_id: RISK_AGENT_ID,
            method: 'score_invoice',
            params: { invoice_id: contractInvoiceId },
          }),
        });

        if (!response.ok) {
          throw new Error(`Weilliptic API error: ${response.statusText}`);
        }

        riskScore = await response.json();
      } catch (error) {
        console.error('Weilliptic agent error:', error);
        // Fallback to local calculation
        riskScore = calculateLocalRiskScore(invoice);
      }
    } else {
      // No Weilliptic agent configured, use local calculation
      riskScore = calculateLocalRiskScore(invoice);
    }

    // Store risk score in database
    await db.collection('invoices').updateOne(
      { _id: invoice._id },
      {
        $set: {
          riskScore: riskScore.overall_score,
          riskLevel: riskScore.risk_level,
          riskDetails: riskScore,
          riskScoredAt: new Date(),
        },
      }
    );

    // Log risk assessment
    await db.collection('transactions').insertOne({
      type: 'RISK_ASSESSMENT',
      invoiceId: invoice.invoiceId,
      userId: new ObjectId(session.user.id),
      riskScore: riskScore.overall_score,
      riskLevel: riskScore.risk_level,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      riskScore,
    });
  } catch (error) {
    console.error('Risk scoring error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate risk score' },
      { status: 500 }
    );
  }
}

// GET /api/risk/score?invoiceId=xxx - Get cached risk score
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    // Build query based on whether invoiceId is a valid ObjectId
    const query = ObjectId.isValid(invoiceId)
      ? {
          $or: [
            { _id: new ObjectId(invoiceId) },
            { invoiceId: invoiceId },
          ],
        }
      : { invoiceId: invoiceId };
    
    const invoice = await db.collection('invoices').findOne(query);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.riskScore) {
      return NextResponse.json(
        { error: 'Risk score not calculated yet', needsCalculation: true },
        { status: 404 }
      );
    }

    return NextResponse.json({
      riskScore: invoice.riskScore,
      riskLevel: invoice.riskLevel,
      riskDetails: invoice.riskDetails,
      calculatedAt: invoice.riskScoredAt,
    });
  } catch (error) {
    console.error('Get risk score error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get risk score' },
      { status: 500 }
    );
  }
}

// Fallback: Local risk calculation (simplified version)
function calculateLocalRiskScore(invoice: any): RiskScore {
  let score = 0;
  const warnings: string[] = [];

  // Status check
  if (invoice.status === 'DRAFT') {
    score += 30;
    warnings.push('Invoice not yet verified by buyer');
  } else if (invoice.status === 'DISPUTED') {
    score += 50;
    warnings.push('Invoice is DISPUTED - do not invest');
  } else if (invoice.status === 'OVERDUE') {
    score += 40;
    warnings.push('Invoice is OVERDUE - high default risk');
  }

  // Document verification
  if (!invoice.documentHash) {
    score += 20;
    warnings.push('No document hash provided');
  }

  // Time to due date
  const now = Date.now();
  const dueDate = new Date(invoice.dueDate).getTime();
  const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);

  if (daysUntilDue < 7) {
    score += 15;
    warnings.push(`Invoice due in ${Math.floor(daysUntilDue)} days - very short term`);
  } else if (daysUntilDue > 90) {
    score += 10;
  }

  // Amount risk
  const amountXLM = parseFloat(invoice.amount) / 10_000_000;
  if (amountXLM > 100000) {
    score += 20;
  } else if (amountXLM > 50000) {
    score += 10;
  }

  // Determine risk level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  let action: string;

  if (score <= 25) {
    riskLevel = 'LOW';
    action = 'APPROVE';
  } else if (score <= 50) {
    riskLevel = 'MEDIUM';
    action = 'REVIEW';
  } else if (score <= 75) {
    riskLevel = 'HIGH';
    action = 'CAUTION';
  } else {
    riskLevel = 'CRITICAL';
    action = 'REJECT';
  }

  return {
    invoice_id: invoice.invoiceId,
    overall_score: score,
    risk_level: riskLevel,
    counterparty_risk: 0,
    financial_risk: 0,
    verification_risk: 0,
    timing_risk: 0,
    market_risk: 0,
    recommended_action: action,
    warnings,
    calculated_at: Math.floor(Date.now() / 1000),
    agent_version: 'local-fallback',
  };
}
