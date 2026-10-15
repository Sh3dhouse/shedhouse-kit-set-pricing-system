import type { Metadata } from 'next';
export const metadata:Metadata={title:'Shed House Pricing',description:'Shared SH team quote workspace'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en-NZ"><body>{children}</body></html>;}
