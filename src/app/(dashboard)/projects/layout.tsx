export default function Layout({ 
  children
}: {
    children: React.ReactNode
}) {
  return (
    <div className="flex h-full w-full flex-col">
      {children}
    </div>
  )
}