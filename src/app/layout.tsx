import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RentDrive - P2P Telematics Escrow",
  description: "Decentralized P2P vehicle rental platform with telematics protection on the Arc Network.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "RentDrive",
    statusBarStyle: "default",
  },
};

import { Web3ContextProvider } from "@/contexts/Web3Context";
import { ModalProvider } from "@/contexts/ModalContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Modal from "@/components/ui/Modal";
import ToastContainer from "@/components/Toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#1C2B3C" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {
                      console.log('[Service Worker] Active scope:', reg.scope);
                    },
                    function(err) {
                      console.warn('[Service Worker] Registration failed:', err);
                    }
                  );
                });
              }
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F2F1EC] text-[#18222F] font-sans">
        <Web3ContextProvider>
          <ModalProvider>
            <NotificationProvider>
              {children}
              <Modal />
              <ToastContainer />
            </NotificationProvider>
          </ModalProvider>
        </Web3ContextProvider>
      </body>
    </html>
  );
}
