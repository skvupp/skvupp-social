import { NextRequest, NextResponse } from "next/server";
import { Client, l } from "@atproto/lex";
import { getSession } from "@/lib/auth/session";
import { getOAuthClient } from "@/lib/auth/client";
import * as xyz from "@/lexicons/xyz";

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { status } = await request.json();

        if (!status || typeof status !== "string") {
            return NextResponse.json({ error: "Status is required" }, { status: 400 });
        }

        const client = await getOAuthClient();
        const oauthSession = await client.restore(session.did);

        if (!oauthSession) {
            return NextResponse.json({ error: "Failed to restore session" }, { status: 401 });
        }

        const lexClient = new Client(oauthSession);

        const createdAt = l.currentDatetimeString();
        const res = await lexClient.create(xyz.statusphere.status, {
            status,
            createdAt,
        });

        return NextResponse.json({
            success: true,
            uri: res.uri,
        });
    } catch (err) {
        console.error("Status creation error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Internal server error" },
            { status: 500 }
        );
    }
}
