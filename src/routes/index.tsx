import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import { createTimeAgo } from "@solid-primitives/date";

// import { ids } from "../ids";

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
  const symbols = unique.filter((m) => !isPositiveInteger(m.slice(1)));

  console.log({ symbols });
  return symbols;
}

function isPositiveInteger(str: string): boolean {
  if (!/^\d+$/.test(str)) {
    return false;
  }
  const num = parseFloat(str);
  return num > 0 && num.toString() === str;
}

async function readAllChunks(
  readableStream: ReadableStream<Uint8Array>,
  callback: (chunk: Uint8Array) => Promise<void>,
) {
  const reader = readableStream.getReader();

  let done;
  while (!done) {
    try {
      let { value, done } = await reader.read();
      console.log({ value, done });
      if (done) {
        return;
      }
      if (value) {
        try {
          await callback(value);
        } catch (e) {
          console.error("readAllChunks: failed to run callback on a chunk: ", {
            e,
          });
        }
      }
    } catch (e) {
      console.error("readAllChunks: failed to read chunk: ", { e });
    }
  }
}

export default function Home() {
  const [tweets, setTweets] = createStore<TweetData[]>([]);
  const [done, setDone] = createSignal(false);

  async function parseChunk(chunk: Uint8Array) {
    const raw_tweet = new TextDecoder().decode(chunk);
    console.log({ raw_tweet });
    const raw = JSON.parse(raw_tweet) as RawTweetData;
    const parsed = parseRawTweet(raw);
    if (!parsed) {
      return;
    }
    setTweets(produce((tweets) => tweets.unshift(parsed)));
  }

  async function fetchTweets() {
    const stream = await fetch("/api/tweets", { method: "GET" });
    console.log({ stream });
    if (!stream.body) {
      console.error("stream failed to return data!");
      return;
    }

    console.log({ body: stream.body });

    try {
      await readAllChunks(stream.body, parseChunk);
      // // read the response chunk-by-chunk!
      // for await (const chunk of stream.body) {
      //   // await new Promise((r) => setTimeout(r, 333));
      //
      //   const raw_tweet = new TextDecoder().decode(chunk);
      //   console.log({ raw_tweet });
      //   try {
      //     const raw = JSON.parse(raw_tweet) as RawTweetData;
      //     const parsed = parseRawTweet(raw);
      //     if (!parsed) {
      //       continue;
      //     }
      //     setTweets(produce((tweets) => tweets.unshift(parsed)));
      //   } catch (e) {
      //     console.log("failed to parse: ", { raw_tweet, e });
      //     continue;
      //   }
      // }
    } catch (e) {
      console.log("error reading from stream: ", { e });
    }
    setDone(true);
  }

  onMount(async () => {
    await fetchTweets();
  });

  return (
    <main class="text-center mx-auto text-gray-700 p-4 md:max-w-lg flex bg-gray-950 h-full w-full">
      <div class="flex flex-col gap-y-3 w-full items-center overflow-y">
        <Show when={done()}>
          <div class="w-full flex items-center justify-center font-mono text-sm text-gray-100">
            Twitter stream has been closed!
          </div>
        </Show>
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
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between w-full text-left">
                    <h2 class="font-semibold text-gray-100">
                      @{_tweet.author.username}
                    </h2>

                    <span class="text-xs whitespace-nowrap tabular-nums tracking-tight text-gray-500">
                      {timeago()}
                    </span>
                  </div>
                  <div class="text-gray-400 text-xs flex flex-wrap gap-x-1 text-xs">
                    <For each={displayedSymbols}>
                      {(symbol) => (
                        <span class="py-0.5 px-1 rounded ring-1 ring-gray-800">
                          {symbol}
                        </span>
                      )}
                    </For>
                  </div>
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
