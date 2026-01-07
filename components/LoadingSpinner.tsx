export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4">
      <div className="relative">
        {/* Outer rotating ring */}
        <div className="w-12 h-12 border-4 border-pink-100 border-t-pink-500 border-r-pink-400 rounded-full animate-spin"></div>
        {/* Inner pulsing dot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 bg-gradient-to-r from-pink-500 to-pink-400 rounded-full animate-pulse shadow-lg shadow-pink-300/50"></div>
        </div>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium text-center">
        <p>🤖 AI đang suy nghĩ...</p>
      </div>
    </div>
  );
}
