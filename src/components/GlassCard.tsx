import type { ReactNode } from 'react';

interface GlassCardProps {
	children: ReactNode;
	className?: string;
	/** Titre de section affiché en petit au-dessus du contenu. */
	title?: string;
	icon?: ReactNode;
}

export function GlassCard({
	children,
	className = '',
	title,
	icon,
}: GlassCardProps) {
	return (
		<section
			className={`rounded-md border border-white/15 bg-white/10 p-3 mt-3 shadow-lg shadow-black/10 backdrop-blur-xl ${className}`}
		>
			{title && (
				<h2 className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider text-white/70 uppercase">
					{icon}
					{title}
				</h2>
			)}
			{children}
		</section>
	);
}
