import Link from "next/link";

export function WhereAWSits() {
    return (
        <section id="stack" className="mx-auto max-w-5xl px-6 pb-24">
            <h2 className="font-display text-center text-4xl tracking-tight">Where AWS sits</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted">
A static web app on CloudFront + S3. A PyTorch engine inside a Lambda
            container behind API Gateway. Mission history lands in DynamoDB, so a
            fleet operator can replay any past run. Serverless, so an NGO scales from
            one boat to a fleet — and pays nothing until a mission runs.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {["API Gateway", "Lambda", "S3 + CloudFront", "DynamoDB", "PyTorch", "Next.js 16"].map(
                    (t) => (
                        <div
                            key={t}
                            className="rounded-2xl border border-border bg-panel px-4 py-3 text-center text-xs font-medium"
                        >
                            {t}
                        </div>
                    ),
                )}
            </div>
            <div className="mt-6 text-center">
                <Link href="/architecture" className="btn-ghost">
                    See the architecture
                </Link>
            </div>
        </section>
    )
}