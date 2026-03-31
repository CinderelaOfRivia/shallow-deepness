import type { Article } from "@/lib/types";

const now = new Date().toISOString();

export const fallbackArticles: Article[] = [
  {
    id: "sample-article-1",
    slug: "the-hive-mind-trap",
    title: "The Hive Mind Trap",
    subtitle: "When consensus replaces conscience, tribalism becomes easy to weaponize",
    excerpt:
      "An opening essay about what happens when morality becomes group-synchronized instead of principle-guided.",
    body_md: `# The Hive Mind Trap

We like to imagine modern people are guided by principle. In practice, many are guided by something far less stable: social consensus.

More and more, good and bad are not treated as truths to be discovered, argued, or lived by. They are treated as temporary verdicts issued by the group. Morality becomes a live poll. The result is a culture in which conviction is replaced by synchronization.

When moral judgment is outsourced to collective sentiment, it becomes vulnerable to manipulation. Consensus can be manufactured. Emotional framing can be optimized. Status incentives can override thought.

The trouble is that the modern person belongs to many tribes at once: family, work, ideology, nation, subculture, audience, algorithmic feed. Each has its own taboos, its own approved language, its own punishments for deviation.

That instability creates ideal conditions for control. A population trained to ask what it is allowed to think is far easier to steer than one trained to ask what is true.

The antidote is not isolation. It is a disciplined conscience: principles sturdy enough to survive the mood of the crowd.
`,
    language: "en",
    status: "published",
    cover_image_url: null,
    tags: ["philosophy", "tribalism", "morality", "culture"],
    featured: true,
    published_at: now,
    created_at: now,
    updated_at: now,
    seo_title: "The Hive Mind Trap",
    seo_description:
      "An essay on consensus morality, tribalism, and the dangers of outsourcing conscience to the crowd.",
  },
];
