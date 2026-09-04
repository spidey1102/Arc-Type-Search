import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="text-slate-400 mb-6">Could not find requested resource</p>
      <Link href="/" className="px-4 py-2 bg-sky-500 text-slate-950 rounded-lg font-medium">
        Return Home
      </Link>
    </div>
  );
}
