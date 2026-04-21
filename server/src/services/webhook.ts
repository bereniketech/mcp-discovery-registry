import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { webhooks } from '../db/schema.js';
import type { ServerResponse } from './server.js';

export type WebhookEvent = 'server.created';

type WebhookType = 'discord' | 'slack' | 'generic';

interface WebhookRow {
  id: string;
  name: string;
  url: string;
  type: string;
  events: string[] | null;
  secret: string | null;
  isActive: boolean;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildDiscordPayload(event: WebhookEvent, server: ServerResponse): Record<string, unknown> {
  return {
    embeds: [
      {
        title: server.name,
        description: server.description || 'No description provided.',
        url: server.githubUrl,
        color: 0x5865f2,
        fields: [
          { name: 'GitHub', value: server.githubUrl, inline: false },
          { name: 'Stars', value: String(server.githubStars), inline: true },
          { name: 'Forks', value: String(server.githubForks), inline: true },
        ],
        footer: { text: `Event: ${event}` },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

function buildSlackPayload(event: WebhookEvent, server: ServerResponse): Record<string, unknown> {
  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `New MCP Server: ${server.name}` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: server.description || 'No description provided.' },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*GitHub:*\n<${server.githubUrl}|${server.githubUrl}>` },
          { type: 'mrkdwn', text: `*Stars:*\n${server.githubStars}` },
        ],
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Event: ${event}` }],
      },
    ],
  };
}

function buildGenericPayload(event: WebhookEvent, server: ServerResponse): Record<string, unknown> {
  return {
    event,
    data: {
      id: server.id,
      name: server.name,
      slug: server.slug,
      description: server.description,
      githubUrl: server.githubUrl,
      githubStars: server.githubStars,
      githubForks: server.githubForks,
      categories: server.categories,
      tags: server.tags,
      createdAt: server.createdAt,
    },
    timestamp: new Date().toISOString(),
  };
}

function computeHmacSignature(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function sendWithRetry(
  webhook: WebhookRow,
  payload: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (webhook.type === 'generic' && webhook.secret) {
    headers['X-Webhook-Signature'] = `sha256=${computeHmacSignature(webhook.secret, body)}`;
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
      });

      if (response.ok) {
        return;
      }

      // 4xx errors are client errors — no point retrying
      if (response.status >= 400 && response.status < 500) {
        console.warn(
          `[WebhookService] Webhook ${webhook.id} returned ${response.status} — skipping retries.`,
        );
        return;
      }

      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
      }
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
      } else {
        console.error(
          `[WebhookService] Webhook ${webhook.id} failed after ${MAX_RETRIES} attempts: ${String(error)}`,
        );
      }
    }
  }
}

export class WebhookService {
  async dispatch(event: WebhookEvent, server: ServerResponse): Promise<void> {
    let activeWebhooks: WebhookRow[];

    try {
      activeWebhooks = await db
        .select({
          id: webhooks.id,
          name: webhooks.name,
          url: webhooks.url,
          type: webhooks.type,
          events: webhooks.events,
          secret: webhooks.secret,
          isActive: webhooks.isActive,
        })
        .from(webhooks)
        .where(eq(webhooks.isActive, true));
    } catch (error) {
      console.error(`[WebhookService] Failed to load webhooks: ${String(error)}`);
      return;
    }

    const subscribed = activeWebhooks.filter((w) => {
      const events = w.events ?? [];
      return events.includes(event);
    });

    if (subscribed.length === 0) {
      return;
    }

    // Fire-and-forget: do not await, do not block caller
    void Promise.allSettled(
      subscribed.map(async (webhook) => {
        const webhookType = webhook.type as WebhookType;
        let payload: Record<string, unknown>;

        if (webhookType === 'discord') {
          payload = buildDiscordPayload(event, server);
        } else if (webhookType === 'slack') {
          payload = buildSlackPayload(event, server);
        } else {
          payload = buildGenericPayload(event, server);
        }

        await sendWithRetry(webhook, payload);
      }),
    );
  }

  async list(): Promise<Omit<WebhookRow, 'secret'>[]> {
    const rows = await db
      .select({
        id: webhooks.id,
        name: webhooks.name,
        url: webhooks.url,
        type: webhooks.type,
        events: webhooks.events,
        isActive: webhooks.isActive,
      })
      .from(webhooks)
      .orderBy(webhooks.createdAt);

    return rows;
  }

  async create(data: {
    name: string;
    url: string;
    type: WebhookType;
    events?: string[];
    secret?: string;
  }): Promise<Omit<WebhookRow, 'secret'>> {
    const [created] = await db
      .insert(webhooks)
      .values({
        name: data.name,
        url: data.url,
        type: data.type,
        events: data.events ?? ['server.created'],
        secret: data.secret ?? null,
      })
      .returning({
        id: webhooks.id,
        name: webhooks.name,
        url: webhooks.url,
        type: webhooks.type,
        events: webhooks.events,
        isActive: webhooks.isActive,
      });

    if (!created) {
      throw new Error('Failed to create webhook');
    }

    return created;
  }

  async update(
    id: string,
    patch: Partial<{
      name: string;
      url: string;
      type: WebhookType;
      events: string[];
      secret: string | null;
      isActive: boolean;
    }>,
  ): Promise<Omit<WebhookRow, 'secret'> | null> {
    const updated = await db
      .update(webhooks)
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.url !== undefined ? { url: patch.url } : {}),
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.events !== undefined ? { events: patch.events } : {}),
        ...(patch.secret !== undefined ? { secret: patch.secret } : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
      })
      .where(eq(webhooks.id, id))
      .returning({
        id: webhooks.id,
        name: webhooks.name,
        url: webhooks.url,
        type: webhooks.type,
        events: webhooks.events,
        isActive: webhooks.isActive,
      });

    return updated[0] ?? null;
  }

  async remove(id: string): Promise<boolean> {
    const deleted = await db
      .delete(webhooks)
      .where(eq(webhooks.id, id))
      .returning({ id: webhooks.id });

    return deleted.length > 0;
  }
}
