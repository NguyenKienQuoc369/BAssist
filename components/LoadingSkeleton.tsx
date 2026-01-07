export default function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-pink-200 rounded w-3/4"></div>
      <div className="h-4 bg-pink-200 rounded w-full"></div>
      <div className="h-4 bg-pink-200 rounded w-5/6"></div>
      <div className="h-4 bg-pink-200 rounded w-2/3"></div>
      <div className="h-4 bg-pink-200 rounded w-4/5"></div>
    </div>
  );
}
