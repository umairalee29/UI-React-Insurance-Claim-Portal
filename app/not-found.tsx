import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-heading font-bold text-primary">404</h1>
        <h2 className="text-xl font-semibold text-gray-900 mt-3">Page not found</h2>
        <p className="text-gray-500 text-sm mt-2">The page you are looking for does not exist.</p>
        <Link
          href="/"
          className="inline-block mt-6 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
