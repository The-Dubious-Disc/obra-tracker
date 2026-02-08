import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/layout/LayoutShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ObraTracker",
  description: "Seguimiento de obras de construcción",
  icons: {
    icon: "/favicon.svg",
  },
};

import { UserRoleProvider } from '@/contexts/UserRoleContext';
import { ProjectProvider } from '@/contexts/ProjectContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ProjectProvider>
          <UserRoleProvider>
            <LayoutShell>{children}</LayoutShell>
          </UserRoleProvider>
        </ProjectProvider>
      </body>
    </html>
  );
}
