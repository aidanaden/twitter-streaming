import { For, createEffect, createMemo, onMount } from "solid-js";
import { ids } from "../ids";
import { createStore, produce } from "solid-js/store";

type RawTweetData = {
  data: {
    article: object;
    id: string;
    author_id: string;
    text: string;
    edit_history_tweet_ids: string[];
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
    <main class="text-center m-auto text-gray-700 p-4 max-w-lg flex justify-center">
      <div class="flex flex-col gap-y-3 w-full items-center overflow-y">
        <For each={tweets.reverse()}>
          {(_tweet) => (
            <div class="py-1.5 px-3 text-sm rounded-lg bg-slate-100 text-slate-400 w-full space-y-1.5">
              <div class="flex items-center gap-x-1.5">
                <h2 class="font-semibold">@{_tweet.author.username}</h2>
                <div class="text-slate-500 text-xs flex gap-x-0.5 font-medium">
                  <For each={_tweet.matchedSymbols}>
                    {(symbol) => <span>{symbol}</span>}
                  </For>
                </div>
              </div>
              <p class="text-left line-clamp-3">{_tweet.text}</p>
            </div>
          )}
        </For>
      </div>
    </main>
  );
}
