import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Solana Community Rewards',
  description: 'Official Solana Community Rewards Program - Connect wallet to check eligibility',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#9945ff" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
    }
