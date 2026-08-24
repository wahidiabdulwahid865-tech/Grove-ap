import "./globals.css";

export const metadata = {
  title: "Grove — grow your habits",
  description: "A habit tracker with visual momentum. Every day checked adds a ring.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
