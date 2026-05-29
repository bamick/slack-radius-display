import type { Metadata } from 'next'
import DisplayFeed from '@/components/DisplayFeed'

export const metadata: Metadata = {
  title: 'Radius Cowork Updates',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ key?: string }>
}

export default async function DisplayPage({ searchParams }: PageProps) {
  const { key } = await searchParams
  return <DisplayFeed displayKey={key ?? ''} />
}
