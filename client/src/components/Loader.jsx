export default function Loader({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
      <div className="w-10 h-10 border-4 border-gov-border border-t-gov-navy rounded-full animate-spin" />
      <p className="font-mono text-sm text-gov-gray tracking-wider">{message}</p>
    </div>
  );
}
