import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "BioFlo",
  description: "Your biohacking personal assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-white text-slate-900">{children}</body>
      </html>
    </ClerkProvider>
  );
}
