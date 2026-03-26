import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Giventech EMS Dashboard",
  description: "Real-time EMS Monitoring and Control System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
