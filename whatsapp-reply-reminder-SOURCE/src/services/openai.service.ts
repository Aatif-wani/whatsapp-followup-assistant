import { FollowUp, Settings } from '@/types';
import { OPENAI_ENDPOINT } from '@utils/constants';
import { createLogger } from '@utils/logger';

const logger = createLogger('openai.service');

interface OpenAiChoice {
  message?: { content?: string };
}

interface OpenAiChatCompletionResponse {
  choices?: OpenAiChoice[];
  error?: { message?: string };
}

/**
 * Thin client around the OpenAI Chat Completions API used to draft a
 * short, natural follow-up message based on the original outgoing
 * message and how long it has gone unanswered.
 */
class OpenAiService {
  /**
   * Requests an AI-drafted message. In 'notify-follow-up' mode this is a
   * gentle nudge to send to someone who hasn't replied to you. In
   * 'notify-reply' mode this is an actual reply to send back to someone
   * whose message you haven't answered yet — a very different task, since
   * it needs to respond to what they actually said instead of just
   * chasing a reply. Throws if the API key is missing, the request fails,
   * or the response cannot be parsed.
   */
  async generateFollowUpSuggestion(followUp: FollowUp, settings: Settings): Promise<string> {
    if (!settings.openAiApiKey) {
      throw new Error('OpenAI API key is not configured. Add it in Settings.');
    }

    const hoursSince = Math.max(1, Math.round((Date.now() - followUp.sentAt) / 3_600_000));
    const isReplyMode = settings.mode === 'notify-reply';

    const systemPrompt = isReplyMode
      ? 'You draft short, natural WhatsApp replies on behalf of the user, responding directly to ' +
        "the other person's message. Keep it under 30 words, warm and casual, and make it a genuine " +
        'reply to what they said (not a generic acknowledgement). Do not include quotation marks or ' +
        'a greeting salutation unless it fits naturally. Return only the message text, nothing else.'
      : 'You write short, friendly, natural follow-up messages for WhatsApp conversations. ' +
        'Keep it under 30 words, casual, and non-pushy. Do not include quotation marks or a greeting ' +
        'salutation unless it fits naturally. Return only the message text, nothing else.';

    const userPrompt = isReplyMode
      ? `${followUp.contactName} sent me this message about ${hoursSince} hour(s) ago and I ` +
        `haven't replied yet:\n"${followUp.lastMessageText}"\n\n` +
        'Write a brief, natural reply I could send now.'
      : `I sent this message to ${followUp.contactName} about ${hoursSince} hour(s) ago and ` +
        `haven't heard back:\n"${followUp.lastMessageText}"\n\n` +
        'Write a brief, polite follow-up message I could send now.';

    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.openAiApiKey}`,
      },
      body: JSON.stringify({
        model: settings.openAiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 80,
      }),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as OpenAiChatCompletionResponse | null;
      const message = errorBody?.error?.message ?? `OpenAI request failed (${response.status})`;
      logger.error('OpenAI request failed', message);
      throw new Error(message);
    }

    const data = (await response.json()) as OpenAiChatCompletionResponse;
    const suggestion = data.choices?.[0]?.message?.content?.trim();

    if (!suggestion) {
      throw new Error('OpenAI returned an empty suggestion.');
    }

    return suggestion;
  }
}

export const openAiService = new OpenAiService();
