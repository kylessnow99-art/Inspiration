import { Inter } from 'next/font/google';
import { AppKitProvider } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Solana Community Rewards',
  description: 'Connect your wallet to verify eligibility for the Sol Community Rewards Pool',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppKitProvider>{children}</AppKitProvider>
      </body>
    </html>
  );
}
