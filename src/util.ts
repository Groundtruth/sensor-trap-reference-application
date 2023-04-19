import http from "node:http";
import contentType from "content-type";
import getRawBody from "raw-body";
import type { Logger } from "pino";

export type Done<T> = { success: true; value: T };
export type NotDone = { success: false; value?: never; error: unknown };

export type DoneOrNotDone<T> = Done<T> | NotDone;

export const isDone = <T>(d: DoneOrNotDone<T>): d is Done<T> => d.success;
export const isNotDone = <T>(d: DoneOrNotDone<T>): d is NotDone => !d.success;

/** There is no try */
export const doOrDoNot =
  <T, S extends any[]>(f: (...a: S) => T) =>
  (...a: S): DoneOrNotDone<T> => {
    try {
      return { success: true, value: f(...a) };
    } catch (error) {
      return { success: false, error };
    }
  };

export const doOrDoNotAsync =
  <T, S extends any[]>(f: (...a: S) => Promise<T>) =>
  async (...a: S): Promise<DoneOrNotDone<T>> => {
    try {
      return { success: true, value: await f(...a) };
    } catch (error) {
      return { success: false, error };
    }
  };

export async function extractBody(
  req: http.IncomingMessage
): Promise<any | undefined> {
  const contentTypeHeader = req.headers["content-type"];
  const contentLengthHeader = req.headers["content-length"];
  if (contentTypeHeader === undefined || contentLengthHeader === undefined) {
    return undefined;
  }

  const parsedContentType = doOrDoNot(contentType.parse)(contentTypeHeader);
  if (parsedContentType.success === false) {
    throw new Error("Bad content type");
  }

  const encoding = parsedContentType.value.parameters["charset"] ?? "utf-8";
  if (encoding !== "utf-8") {
    throw new Error("Bad encoding");
  }

  if (parsedContentType.value.type !== "application/json") {
    throw new Error("Bad content type");
  }

  const body = await doOrDoNotAsync(getRawBody)(req, {
    length: contentLengthHeader,
    limit: 100_000,
    encoding,
  });

  if (body.success === false) {
    console.log(body.error);
    throw new Error("Bad body");
  }

  const json = doOrDoNot((s) => JSON.parse(s))(body.value);

  if (json.success === false) {
    throw new Error("Bad body JSON");
  }

  return json.value;
}

export function extractQuery(
  searchParams: URLSearchParams
): Record<string, string[]> {
  return Object.fromEntries(
    Array.from(searchParams.keys()).map((key) => {
      const values = searchParams.getAll(key);
      return [key, values];
    })
  );
}

export function extractHeaders(
  headers: http.IncomingHttpHeaders
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(
        (header): header is [string, string | string[]] =>
          header[1] !== undefined
      )
      .map(([key, value]) => [key, Array.isArray(value) ? value : [value]])
  );
}

export type Request = {
  path: string;
  headers: Record<string, string[]>;
  query: Record<string, string[]>;
  body: any;
  logger: Logger;
};

export function wrapHandle(
  handle: (req: Request, res: http.ServerResponse) => Promise<void>,
  globalLogger: Logger
): http.RequestListener {
  return async (req, res) => {
    const host = req.headers.host;

    if (host === undefined) {
      res.statusCode = 400;
      res.end();
      return;
    }

    if (req.url !== "/") {
      res.statusCode = 404;
      res.end();
      return;
    }

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end();
      return;
    }

    const { success, value: url } = doOrDoNot(
      (u: string) => new URL(u, `http://${req.headers.host}`)
    )(req.url);
    if (success === false) {
      res.statusCode = 500;
      res.end("Invalid URL?");
      return;
    }

    const query = extractQuery(url.searchParams);
    const headers = extractHeaders(req.headers);
    const body = await extractBody(req);

    const logger = globalLogger.child({
      method: req.method,
      path: url.pathname,
      headers,
      query,
      body,
    });

    return await handle(
      { path: url.pathname, headers, query, body, logger },
      res
    );
  };
}
