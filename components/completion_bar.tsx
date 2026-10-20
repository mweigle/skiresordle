
export default function CompletionBar({ percentage }: { percentage: number }) {
  return <span className="z-2 mt-10 h-fit p-3 bg-background col-start-2 col-span-2 flex items-center justify-center rounded-md">
    You found {percentage}%!
  </span>;
}