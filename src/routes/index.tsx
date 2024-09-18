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
import { hc } from "hono/client";

// import { ids } from "../ids";
const SYMBOLS = [
  "SOL",
  "WIF",
  "JUP",
  "PYTH",
  "JTO",
  "ORCA",
  "DRIFT",
  "ZEX",
  "CLOUD",
  "PYUSD",
  "POPCAT",
  "MOTHER",
  "BILLY",
  "NEIRO",
];

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

export default function Home() {
  const [tweets, setTweets] = createStore<TweetData[]>([]);
  const [done, setDone] = createSignal(false);

  async function fetchTweets() {
    const client = hc("https://tweetstream-ws.adenxtreme.workers.dev");
    const ws = client.ws.$ws(0);

    ws.addEventListener("message", (message) => {
      const tweet = JSON.parse(message.data) as TweetData;
      console.log("message received by server: ", { message });
      setTweets(produce((tweets) => tweets.unshift(tweet)));
    });

    ws.send("open");
  }

  onMount(async () => {
    await fetchTweets();
  });

  return (
    <main class="text-center mx-auto text-gray-700 p-4 md:max-w-lg flex bg-gray-950 h-full w-full justify-center flex-col gap-y-6">
      <div class="space-y-1.5 flex flex-col items-center justify-center text-xs text-gray-400 w-full">
        <div class="w-full text-center">Approved symbols:</div>
        <div class="flex gap-1 justify-center w-full flex-wrap content-center items-center md:w-xs">
          <For each={SYMBOLS}>
            {(symbol) => <span class="font-mono">${symbol}</span>}
          </For>
        </div>
      </div>
      <div class="flex flex-col gap-y-3 w-full items-center overflow-y">
        <Show when={done()}>
          <div class="w-full flex items-center justify-center font-mono text-sm text-gray-100">
            Twitter stream has been closed!
          </div>
        </Show>
        <Show when={tweets.length === 0 && !done()}>Fetching...</Show>
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
                          ${symbol}
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
