import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RideFlow — Admin Dashboard",
  description: "RideFlow ride-hailing platform management dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
