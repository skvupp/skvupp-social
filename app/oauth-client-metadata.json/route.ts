import { getOAuthClient } from "@/lib/auth/client";
import { NextResponse } from "next/server";

// The URL of this endpoint IS your client_id
// Authorization servers fetch this to learn about your app

export const dynamic = "force-dynamic";

export async function GET() {
    const client = await getOAuthClient(true);
    return NextResponse.json(client.clientMetadata, {
        headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    });
}
