'use client';
import React from 'react';
import { motion } from "framer-motion";

// --- Types ---
interface Testimonial {
    text: string;
    image: string;
    name: string;
    role: string;
}

// --- Data ---
const testimonials: Testimonial[] = [
    {
        text: "Sangini revolutionized our cash flow. We converted our outstanding invoices into instant liquidity within seconds.",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Priya Sharma",
        role: "Supplier",
    },
    {
        text: "As an investor, the Dutch auction mechanism ensures I get fair market rates. The returns are consistent and secured by the insurance pool.",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Rahul Verma",
        role: "DeFi Investor",
    },
    {
        text: "The zero-oracle verification gives us complete confidence. Knowing buyer signatures are on-chain eliminates fraud risk entirely.",
        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Anjali Gupta",
        role: "Corporate Buyer",
    },
    {
        text: "Integration with our existing systems was flawless. We can now approve invoices and let suppliers finance them without touching our balance sheet.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Vikram Malhotra",
        role: "CFO, TechCorp",
    },
    {
        text: "Deep-tier financing is a game changer. We're a tier-2 supplier, but we get rates as if we were a tier-1 partner.",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Neha Patel",
        role: "SME Owner",
    },
    {
        text: "The yield I generate on Sangini outperforms my traditional fixed income portfolio, and with shorter lock-in periods.",
        image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Arjun Singh",
        role: "Crypto Fund Manager",
    },
    {
        text: "Transparency is key. seeing every transaction on the Stellar ledger gives me peace of mind that my investments are real.",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Farhan Siddiqui",
        role: "Angel Investor",
    },
    {
        text: "Finally, a solution that solves the working capital gap for MSMEs in India. Sangini is essential infrastructure.",
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Sana Sheikh",
        role: "Fintech Consultant",
    },
    {
        text: "The UI is incredible. It doesn't feel like a complex blockchain app, it feels like a modern fintech dashboard.",
        image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150",
        name: "Hassan Ali",
        role: "Product Designer",
    },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

// --- Sub-Components ---
const TestimonialsColumn = (props: {
    className?: string;
    testimonials: Testimonial[];
    duration?: number;
}) => {
    return (
        <div className={props.className}>
            <motion.ul
                animate={{
                    translateY: "-50%",
                }}
                transition={{
                    duration: props.duration || 10,
                    repeat: Infinity,
                    ease: "linear",
                    repeatType: "loop",
                }}
                className="flex flex-col gap-6 pb-6 bg-transparent transition-colors duration-300 list-none m-0 p-0"
            >
                {[
                    ...new Array(2).fill(0).map((_, index) => (
                        <React.Fragment key={index}>
                            {props.testimonials.map(({ text, image, name, role }, i) => (
                                <motion.li
                                    key={`${index}-${i}`}
                                    aria-hidden={index === 1 ? "true" : "false"}
                                    tabIndex={index === 1 ? -1 : 0}
                                    whileHover={{
                                        scale: 1.03,
                                        y: -8,
                                        boxShadow: "0 25px 50px -12px rgba(244, 63, 94, 0.15), 0 10px 10px -5px rgba(244, 63, 94, 0.05), 0 0 0 1px rgba(244, 63, 94, 0.1)",
                                        transition: { type: "spring", stiffness: 400, damping: 17 }
                                    }}
                                    className="p-8 rounded-3xl border border-white/10 shadow-lg max-w-xs w-full bg-white/5 backdrop-blur-md transition-all duration-300 cursor-default select-none group hover:border-rose-500/30"
                                >
                                    <blockquote className="m-0 p-0">
                                        <p className="text-white/70 leading-relaxed font-normal m-0 transition-colors duration-300">
                                            "{text}"
                                        </p>
                                        <footer className="flex items-center gap-3 mt-6">
                                            <img
                                                width={40}
                                                height={40}
                                                src={image}
                                                alt={`Avatar of ${name}`}
                                                className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-rose-500/50 transition-all duration-300 ease-in-out"
                                            />
                                            <div className="flex flex-col">
                                                <cite className="font-semibold not-italic tracking-tight leading-5 text-white transition-colors duration-300">
                                                    {name}
                                                </cite>
                                                <span className="text-sm leading-5 tracking-tight text-white/50 mt-0.5 transition-colors duration-300">
                                                    {role}
                                                </span>
                                            </div>
                                        </footer>
                                    </blockquote>
                                </motion.li>
                            ))}
                        </React.Fragment>
                    )),
                ]}
            </motion.ul>
        </div>
    );
};

export const TestimonialsSection = () => {
    return (
        <section
            aria-labelledby="testimonials-heading"
            className="bg-transparent py-24 relative overflow-hidden"
        >
            <motion.div
                initial={{ opacity: 0, y: 50, rotate: -2 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                    duration: 1.2,
                    ease: [0.16, 1, 0.3, 1],
                    opacity: { duration: 0.8 }
                }}
                className="container px-4 z-10 mx-auto"
            >
                <div className="flex flex-col items-center justify-center max-w-[540px] mx-auto mb-16">
                    <div className="flex justify-center">
                        <div className="border border-white/20 py-1 px-4 rounded-full text-xs font-semibold tracking-wide uppercase text-white/70 bg-white/5 backdrop-blur transition-colors">
                            Community
                        </div>
                    </div>

                    <h2 id="testimonials-heading" className="text-4xl md:text-5xl font-extrabold tracking-tight mt-6 text-center text-white transition-colors">
                        Trusted by Leaders
                    </h2>
                    <p className="text-center mt-5 text-white/60 text-lg leading-relaxed max-w-sm transition-colors">
                        See how Sangini is transforming trade finance for suppliers, buyers, and investors.
                    </p>
                </div>

                <div
                    className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] max-h-[740px] overflow-hidden"
                    role="region"
                    aria-label="Scrolling Testimonials"
                >
                    <TestimonialsColumn testimonials={firstColumn} duration={35} />
                    <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={45} />
                    <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={40} />
                </div>
            </motion.div>
        </section>
    );
};
