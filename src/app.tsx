import "@unocss/reset/tailwind.css";
import "virtual:uno.css";

import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import Nav from "~/components/Nav";

export default function App() {
  return (
    <Router
      root={(props) => (
        <div class="flex !min-h-[100svh] min-h-[100vh] flex-col bg-gray-950">
          <Nav />
          <Suspense>{props.children}</Suspense>
        </div>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
