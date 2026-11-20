// A template remounts on every navigation (a layout does not), so the entrance animation replays on each screen change.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter flex flex-1 flex-col">{children}</div>;
}
