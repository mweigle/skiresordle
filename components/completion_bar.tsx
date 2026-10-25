
export default function CompletionBar({ percentage }: { percentage: number }) {
  return <div className="relative z-2 mt-10 h-fit p-3 bg-background col-start-2 col-span-2 flex items-center justify-center rounded-md">
    <span className="z-3">You found {percentage}%!</span>
    <div className="absolute top-0 left-0 origin-left rounded-md h-full bg-success animate-progress-fill motion-reduce:animate-none" style={{ width: `${percentage}%` }}></div>
  </div>;
}
