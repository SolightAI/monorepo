import { Link, Outlet } from "react-router-dom";

export function DemoLayout() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col gap-12">
      <nav className="bg-white flex justify-center py-4 items-center border-b border-gray-200">
        <Link to="/" className="font-bold text-xl text-gray-800">
          Solight
        </Link>
      </nav>

      <main className="flex grow flex-col w-full *:mb-12 sm:mb-0">
        <Outlet />
      </main>
    </div>
  )
}