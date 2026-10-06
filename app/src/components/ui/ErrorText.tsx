/** Error message; renders nothing when there is none */
export default function ErrorText({ children }: { children: string | null | undefined }) {
    if (!children) return null
    return (
        <p role="alert" className="text-sm text-red-600">
            {children}
        </p>
    )
}
