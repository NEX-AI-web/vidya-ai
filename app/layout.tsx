import './globals.css';
import type { ReactNode } from 'react';
import { NexenInspector } from '@/components/_internal/NexenInspector';

export const metadata = {
  title: 'Vidya AI - Class 8 Bilingual Math Tutor',
  description: 'AI Math Tutor for Andhra Pradesh Government School Students',
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body>
				<NexenInspector />
				{children}
			</body>
		</html>
	);
}
