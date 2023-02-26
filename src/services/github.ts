/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export class BaseAPIError extends Error {
    constructor(
        public override name: string,
        public url: string,
        public description: string,
        public response?: Response,
    ) {
        super(`GitHub${name}: ${url}: ${description}`);
    }
}

export class UnknownError extends BaseAPIError {
    constructor(url: string, description: string, response: Response) {
        super(`NotFoundError`, url, description, response);
    }
}

export class NotFoundError extends BaseAPIError {
    constructor(url: string, response: Response) {
        super(`NotFoundError`, url, "not found", response);
    }
}

export class GitHub {
    static readonly base_url = "https://api.github.com/";
    static readonly api_version = "2022-11-28";
    static readonly accept_header = "application/vnd.github+json";

    headers: Record<string, string>;
    last_response?: Response;
    rate_limit_remaining?: number;

    constructor() {
        this.headers = {
            Accept: GitHub.accept_header,
            "X-GitHub-Api-Version": GitHub.api_version,
        };
    }

    async request(path: string, data?: unknown): Promise<unknown> {
        const static_this = this.constructor as typeof GitHub;

        const request = new Request(new URL(path, static_this.base_url), {
            method: data ? "POST" : "GET",
            headers: this.headers,
            body: data ? JSON.stringify(data) : undefined,
        });

        const response = await fetch(request);
        await this.handle_server_error(response);

        this.last_response = response;

        console.log(response.headers);

        this.rate_limit_remaining = parseInt(
            response.headers.get("x-ratelimit-remaining") ?? "",
            10,
        );

        if (
            response.headers.get("content-type") ==
            "application/json; charset=utf-8"
        ) {
            return await response.json();
        } else {
            return await response.text();
        }
    }

    async handle_server_error(response: Response) {
        switch (response.status) {
            case 200:
                return;
            case 404: {
                throw new NotFoundError(response.url, response);
            }
            case 500: {
                throw new UnknownError(
                    response.url,
                    await response.text(),
                    response,
                );
            }
        }
    }
}

export class GitHubUserContent {
    static readonly base_url = "https://raw.githubusercontent.com/";

    constructor() {}

    async get(url_or_path: string | URL): Promise<File> {
        const url = new URL(url_or_path, GitHubUserContent.base_url);
        const request = new Request(url, { method: "GET" });
        const response = await fetch(request);
        const blob = await response.blob();
        const name = url.pathname.split("/").at(-1) ?? "unknown";

        return new File([blob], name);
    }

    /**
     * Converts GitHub UI paths to valid paths for raw.githubusercontent.com.
     *
     * https://github.com/wntrblm/Helium/blob/main/hardware/board/board.kicad_sch
     * becomes
     * https://raw.githubusercontent.com/wntrblm/Helium/main/hardware/board/board.kicad_sch
     */
    convert_url(url: string): URL {
        const u = new URL(url, "https://github.com/");

        if (u.host == "raw.githubusercontent.com") {
            return u;
        }

        const parts = u.pathname.split("/");

        if (parts.length < 4) {
            throw new Error(
                `URL ${url} can't be converted to a raw.githubusercontent.com URL`,
            );
        }

        const [_, user, repo, blob, ref, ...path_parts] = parts;

        if (blob != "blob") {
            throw new Error(
                `URL ${url} can't be converted to a raw.githubusercontent.com URL`,
            );
        }

        const path = [user, repo, ref, ...path_parts].join("/");

        return new URL(path, GitHubUserContent.base_url);
    }
}
