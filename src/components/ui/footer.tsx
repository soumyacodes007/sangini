'use client';
import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, Twitter, Github, Linkedin, Disc } from 'lucide-react';

type FooterProps = React.ComponentProps<'footer'> & {
    children?: React.ReactNode;
};

export function Footer({ className, ...props }: FooterProps) {
    return (
        <footer
            className={cn(
                'border-t border-white/5 bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-sm',
                className,
            )}
            {...props}
        >
            <div className="relative mx-auto max-w-5xl px-4 py-12">
                <div className="relative grid grid-cols-1 gap-8 border-x border-white/5 md:grid-cols-4 md:divide-x md:divide-white/5">
                    <div className="md:pr-4">
                        <SocialCard title="Twitter" href="https://twitter.com" icon={<Twitter className="h-4 w-4" />} />
                        <LinksGroup
                            title="Platform"
                            links={[
                                { title: 'Features', href: '#features' },
                                { title: 'How it Works', href: '#how-it-works' },
                                { title: 'Pricing', href: '#' },
                                { title: 'Testimonials', href: '#testimonials' },
                            ]}
                        />
                    </div>
                    <div className="md:px-4">
                        <SocialCard title="GitHub" href="https://github.com" icon={<Github className="h-4 w-4" />} />
                        <LinksGroup
                            title="Resources"
                            links={[
                                { title: 'Documentation', href: '#' },
                                { title: 'API Reference', href: '#' },
                                { title: 'Whitepaper', href: '#' },
                                { title: 'Brand Assets', href: '#' },
                            ]}
                        />
                    </div>

                    <div className="md:px-4">
                        <SocialCard title="Discord" href="https://discord.com" icon={<Disc className="h-4 w-4" />} />
                        <LinksGroup
                            title="Community"
                            links={[
                                { title: 'Forum', href: '#' },
                                { title: 'Events', href: '#' },
                                { title: 'Blog', href: '#' },
                                { title: 'Governance', href: '#' },
                            ]}
                        />
                    </div>
                    <div className="md:pl-4">
                        <SocialCard title="LinkedIn" href="https://linkedin.com" icon={<Linkedin className="h-4 w-4" />} />
                        <LinksGroup
                            title="Legal"
                            links={[
                                { title: 'Terms of Use', href: '#' },
                                { title: 'Privacy Policy', href: '#' },
                                { title: 'Cookie Policy', href: '#' },
                                { title: 'Disclaimers', href: '#' },
                            ]}
                        />
                    </div>
                </div>
            </div>
            <div className="flex justify-center border-t border-white/5 p-6 bg-transparent">
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 rounded-lg bg-white flex items-center justify-center">
                            <span className="text-xs font-bold text-black">S</span>
                        </div>
                        <span className="font-semibold text-white">Sangini</span>
                    </div>
                    <p className="text-white/40 text-xs">
                        © {new Date().getFullYear()} Sangini Protocol. Built on Stellar.
                    </p>
                </div>
            </div>
        </footer>
    );
}

interface LinksGroupProps {
    title: string;
    links: { title: string; href: string }[];
}
function LinksGroup({ title, links }: LinksGroupProps) {
    return (
        <div className="p-4">
            <h3 className="text-white/60 mb-4 text-xs font-medium tracking-wider uppercase">
                {title}
            </h3>
            <ul className="space-y-2">
                {links.map((link) => (
                    <li key={link.title}>
                        <a
                            href={link.href}
                            className="text-white/40 hover:text-rose-400 transition-colors text-sm block"
                        >
                            {link.title}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function SocialCard({ title, href, icon }: { title: string; href: string, icon?: React.ReactNode }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between border-t border-b border-white/10 p-3 text-sm md:border-t-0 hover:bg-white/5 transition-colors"
        >
            <span className="font-medium text-white/80 group-hover:text-white flex items-center gap-2">
                {icon} {title}
            </span>
            <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-rose-400 transition-colors" />
        </a>
    );
}
