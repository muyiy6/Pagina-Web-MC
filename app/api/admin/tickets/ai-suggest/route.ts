import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import TicketReply from '@/models/TicketReply';
import { ollamaChat } from '@/lib/ai/ollama';
import { getKbSnippets } from '@/lib/ai/kb';
import { groqChat } from '@/lib/ai/groq';

function parseProvider(v: string | undefined) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'groq') return 'groq' as const;
  if (s === 'auto') return 'auto' as const;
  return 'ollama' as const;
}

async function listOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/tags`, { method: 'GET' });
    const data = await res.json().catch(() => ({}));
    const models = Array.isArray((data as any)?.models) ? ((data as any).models as any[]) : [];
    return models
      .map((m) => String(m?.name || '').trim())
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return [];
  }
}

function isStaffRole(role?: string) {
  return role === 'ADMIN' || role === 'STAFF' || role === 'OWNER';
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (!isStaffRole((user as any)?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const ticketId = typeof (body as any)?.ticketId === 'string' ? (body as any).ticketId : '';

    if (!ticketId) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const baseUrl = (process.env.OLLAMA_BASE_URL || '').trim();
    const provider = parseProvider(process.env.TICKETS_AI_PROVIDER);
    if ((provider === 'ollama' || provider === 'auto') && !baseUrl) {
      return NextResponse.json(
        {
          error: 'AI not configured',
          hint: 'Set OLLAMA_BASE_URL (e.g. http://127.0.0.1:11434) and optionally OLLAMA_MODEL (e.g. llama3.1).',
        },
        { status: 501 }
      );
    }

    if ((provider === 'groq' || provider === 'auto') && !(process.env.GROQ_API_KEY || '').trim()) {
      return NextResponse.json(
        {
          error: 'AI not configured',
          hint: 'Set GROQ_API_KEY (and optionally GROQ_MODEL) or switch TICKETS_AI_PROVIDER to ollama.',
        },
        { status: 501 }
      );
    }

    await dbConnect();

    const ticket = await Ticket.findById(ticketId).lean();
    if (!ticket) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const replies = await TicketReply.find({ ticketId }).sort({ createdAt: 1 }).lean();

    const convo = [
      {
        from: 'user',
        username: (ticket as any).username,
        message: (ticket as any).message,
        at: (ticket as any).createdAt,
      },
      ...replies.map((r: any) => ({
        from: r.isStaff ? 'staff' : 'user',
        username: r.username,
        message: r.message,
        at: r.createdAt,
      })),
    ];

    const kb = await getKbSnippets(`${(ticket as any).subject}\n${(ticket as any).message}`);

    const kbText = kb
      .map((k) => `--- ${k.id}\n${k.snippet.trim()}`)
      .join('\n\n')
      .slice(0, 6000);

    const convoText = convo
      .map((m) => {
        const who = m.from === 'staff' ? 'STAFF' : 'USER';
        return `[${who}] ${m.username}: ${String(m.message || '').trim()}`;
      })
      .join('\n')
      .slice(0, 8000);

    const system =
      'You are a support-staff assistant for a Minecraft server website.\n' +
      '- Use the provided knowledge snippets when relevant.\n' +
      "- If you are unsure, say so and ask 1-3 clarifying questions.\n" +
      '- Do not invent policies or prices.\n' +
      '- Respond in the language of the user (Spanish or English).\n' +
      'Return ONLY valid JSON with this schema:\n' +
      '{"language":"es"|"en","summary":string,"category":"TECHNICAL"|"BILLING"|"BAN_APPEAL"|"REPORT"|"OTHER","priority":"LOW"|"MEDIUM"|"HIGH","suggestedStatus":"OPEN"|"IN_PROGRESS"|"CLOSED","replyDraft":string,"followUpQuestions":string[],"internalNotes":string}.\n';

    const userPrompt =
      `Ticket subject: ${(ticket as any).subject}\n` +
      `Ticket category: ${(ticket as any).category}\n` +
      `Ticket status: ${(ticket as any).status}\n` +
      `\nConversation:\n${convoText}\n` +
      `\nKnowledge snippets (may be empty):\n${kbText || '(none)'}\n`;

    const raw =
      provider === 'groq'
        ? await groqChat({
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
            maxTokens: 700,
          })
        : await ollamaChat({
            baseUrl,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
          });

    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, raw, parsed });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const causeCode = (error as any)?.cause?.code;
    const msg = String(error?.message || '');
    const isConnRefused = causeCode === 'ECONNREFUSED' || msg.toLowerCase().includes('fetch failed');
    if (isConnRefused) {
      const baseUrl = (process.env.OLLAMA_BASE_URL || '').trim() || 'http://127.0.0.1:11434';
      return NextResponse.json(
        {
          error: 'AI unavailable',
          hint:
            `Cannot reach Ollama at ${baseUrl}. Start Ollama (ollama serve / open the Ollama app) and ensure the model exists (e.g. ollama pull llama3.1).`,
        },
        { status: 502 }
      );
    }

    const isOllamaModelMissing = msg.includes("Ollama error (404)") && msg.toLowerCase().includes('model') && msg.toLowerCase().includes('not found');
    if (isOllamaModelMissing) {
      const baseUrl = (process.env.OLLAMA_BASE_URL || '').trim() || 'http://127.0.0.1:11434';
      const wantModel = (process.env.OLLAMA_MODEL || 'llama3.1').trim();
      const models = await listOllamaModels(baseUrl);
      return NextResponse.json(
        {
          error: 'Ollama model not found',
          hint:
            models.length > 0
              ? `Model '${wantModel}' is not installed. Set OLLAMA_MODEL to one of: ${models.join(', ')} (or pull it with: ollama pull ${wantModel}).`
              : `Model '${wantModel}' is not installed. Run: ollama pull ${wantModel} OR set OLLAMA_MODEL to an installed model (check /api/tags).`,
        },
        { status: 502 }
      );
    }

    console.error('admin/tickets/ai-suggest error:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
