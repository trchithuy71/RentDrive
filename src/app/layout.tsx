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
};

import { Web3ContextProvider } from "@/contexts/Web3Context";
import { ModalProvider } from "@/contexts/ModalContext";
import Modal from "@/components/ui/Modal";

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
      <body className="min-h-full flex flex-col bg-[#F2F1EC] text-[#18222F] font-sans">
        <Web3ContextProvider>
          <ModalProvider>
            {children}
            <Modal />
          </ModalProvider>
        </Web3ContextProvider>
      </body>
    </html>
  );
}
