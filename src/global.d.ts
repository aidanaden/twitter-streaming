/// <reference types="@solidjs/start/env" />
//
interface ReadableStream<R = any> {
  [Symbol.asyncIterator](): AsyncIterableIterator<R>;
}
