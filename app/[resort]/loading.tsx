export default function GameLoading() {
  return <main className="flex justify-center items-center mt-10">
    <svg className="mr-3 -ml-1 size-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25 text-selection" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75 fill-selection" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Loading Ski Resort data...
  </main>
}
