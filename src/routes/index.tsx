import { For, createEffect, createMemo, onMount } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { createTimeAgo } from "@solid-primitives/date";

import { ids } from "../ids";

type RawTweetData = {
  data: {
    article: object;
    id: string;
    author_id: string;
    text: string;
    edit_history_tweet_ids: string[];
    created_at: string;
  };
  includes: {
    users: TweetUserData[];
  };
  matching_rules: { id: string; tag: string }[];
};

type TweetData = {
  author: TweetUserData;
  id: string;
  text: string;
  matchedSymbols: string[];
  createdAt: Date;
};

type TweetUserData = {
  id: string;
  name: string;
  username: string;
  profile_image_url: string;
};

function parseRawTweet(raw: RawTweetData): TweetData | undefined {
  const author = raw.includes.users.find((u) => u.id === raw.data.author_id);
  if (!author) {
    return;
  }
  const matchedSymbols = findDollarSubstrings(raw.data.text);
  if (matchedSymbols.length === 0) {
    return;
  }
  return {
    author: author,
    id: raw.data.id,
    text: raw.data.text,
    matchedSymbols,
    createdAt: new Date(raw.data.created_at),
  };
}

function findDollarSubstrings(text: string): string[] {
  const regex = /\$\w+/g;
  const matched = text.match(regex);
  if (!matched) {
    return [];
  }
  const unique = Array.from(new Set(matched));
  console.log({ unique });
  const symbols = unique.filter((m) => !isPositiveInteger(m.slice(1)));

  console.log({ symbols });
  return symbols;
}

function isPositiveInteger(str: string): boolean {
  if (!/^\d+$/.test(str)) {
    return false;
  }
  const num = parseInt(str, 10);
  return num > 0 && num.toString() === str;
}

export default function Home() {
  const [tweets, setTweets] = createStore<TweetData[]>([]);
  const start = performance.now();
  const tweetsPerSecond = createMemo(() => {
    const now = performance.now();
    const elapsed = (now - start) / 1000;
    return tweets.length / elapsed;
  });
  createEffect(() => {
    console.log("tweets per second: ", { tweetsPerSecond: tweetsPerSecond() });
  });

  async function fetchTweets() {
    console.log({ ids: ids.length });
    const stream = await fetch("/api/tweets", { method: "GET" });
    console.log({ stream });
    if (!stream.body) {
      console.error("stream failed to return data!");
      return;
    }

    console.log({ body: stream.body });

    // let max = 0;

    try {
      // read the response chunk-by-chunk!
      for await (const chunk of stream.body) {
        await new Promise((r) => setTimeout(r, 500));

        const raw_tweet = new TextDecoder().decode(chunk);
        console.log({ raw_tweet });
        try {
          const raw = JSON.parse(raw_tweet) as RawTweetData;
          const parsed = parseRawTweet(raw);
          if (!parsed) {
            continue;
          }
          setTweets(produce((tweets) => tweets.unshift(parsed)));
        } catch (e) {
          console.log("failed to parse: ", { raw_tweet, e });
          continue;
        }
      }
    } catch (e) {
      console.log("error reading from stream: ", { e });
    }
  }

  onMount(async () => {
    await fetchTweets();
  });

  return (
    <main class="text-center mx-auto text-gray-700 p-4 max-w-lg flex bg-gray-950 h-full">
      <div class="flex flex-col gap-y-3 w-full items-center overflow-y">
        <For each={tweets}>
          {(_tweet) => {
            const [timeago] = createTimeAgo(_tweet.createdAt, {
              interval: 1000,
              min: 1000,
            });
            const displayedSymbols =
              _tweet.matchedSymbols.length > 3
                ? _tweet.matchedSymbols.slice(0, 3)
                : _tweet.matchedSymbols;
            const remaining =
              _tweet.matchedSymbols.length > 3
                ? _tweet.matchedSymbols.length - 3
                : 0;
            if (remaining > 0) {
              displayedSymbols.push(`+${remaining} more`);
            }
            return (
              <a
                class="py-1.5 px-3 text-sm rounded-lg w-full space-y-1.5 bg-gray-900/70 ring-1 ring-gray-800 transition hover:ring-gray-600"
                target="_blank"
                href={`https://twitter.com/${_tweet.author.username}/status/${_tweet.id}`}
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-x-1.5">
                    <h2 class="font-semibold text-gray-100">
                      @{_tweet.author.username}
                    </h2>
                    <div class="text-gray-400 text-xs flex gap-x-1 text-xs">
                      <For each={displayedSymbols}>
                        {(symbol) => (
                          <span class="py-0.5 px-1 rounded ring-1 ring-gray-800">
                            {symbol}
                          </span>
                        )}
                      </For>
                    </div>
                  </div>

                  <span class="text-xs whitespace-nowrap tabular-nums tracking-tight text-gray-500">
                    {timeago()}
                  </span>
                </div>
                <p class="text-left line-clamp-3 text-gray-600">
                  {_tweet.text}
                </p>
              </a>
            );
          }}
        </For>
      </div>
    </main>
  );
}
