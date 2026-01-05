'use client';

import { FileText, Building2, CheckCircle2 } from "lucide-react"

export function HowItWorks() {
    const steps = [
        {
            step: '01',
            title: 'Mint & Verify',
            desc: 'Supplier uploads invoice. Buyer digitally signs it on-chain.',
            icon: FileText
        },
        {
            step: '02',
            title: 'Tokenize & Sell',
            desc: 'Invoice is tokenized. Investors buy fractions for instant liquidity.',
            icon: Building2
        },
        {
            step: '03',
            title: 'Settle & Earn',
            desc: 'Buyer pays maturity amount. Smart contract distributes yield.',
            icon: CheckCircle2
        }
    ]

    return (
        <section id="how-it-works" className="py-24">
            <div className="container px-4 md:px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Seamless Workflow</h2>
                    <p className="text-muted-foreground mt-4 text-lg">From invoice to cash in three simple steps</p>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-[60px] left-0 w-full h-[2px] bg-gradient-to-r from-muted via-primary/20 to-muted z-0" />

                    {steps.map((item, i) => (
                        <div key={i} className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-32 h-32 rounded-full bg-background border-4 border-muted flex items-center justify-center mb-6 relative">
                                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                                    <item.icon className="w-10 h-10 text-primary" />
                                </div>
                                <div className="absolute top-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold ring-4 ring-background">
                                    {item.step}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                            <p className="text-muted-foreground max-w-xs">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
