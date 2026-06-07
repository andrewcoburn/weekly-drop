import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateMutinyCaptions(
  captainName: string,
  groupName: string,
  memberCount: number,
  weekDateStr: string
): Promise<[string, string, string]> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `You are writing Instagram captions for a private friend group called "${groupName}".
It's the week of ${weekDateStr}. The group has ${memberCount} members.
The weekly captain (${captainName}) didn't submit a caption in time, so the group is voting.

Generate exactly 3 short, fun captions for the weekly photo drop. Rules:
- Each caption must be under 150 characters
- Warm, playful, friend-group energy — like inside jokes, not corporate
- Caption 1: a general vibe caption about the week/memories
- Caption 2: something nostalgic or sentimental but still fun
- Caption 3: MUST playfully call out ${captainName} for missing their captain duty (e.g. "${captainName} really said not my week 💀")

Respond with ONLY a JSON array of 3 strings, nothing else.
Example: ["caption one", "caption two", "caption three"]`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'

  try {
    const captions = JSON.parse(text) as string[]
    if (captions.length === 3) {
      return [captions[0], captions[1], captions[2]]
    }
  } catch {
    // fallback captions if parsing fails
  }

  return [
    `another week, another drop 📸`,
    `the memories we make when we're not trying 🫶`,
    `${captainName} really said not my week 💀 but the squad delivered`,
  ]
}
