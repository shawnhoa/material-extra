export const defaultEndpoints = {
  posts: "/api/posts",
  post: "/api/posts/:id",
  archive: "/api/archive",
  friends: "/api/friends",
  announcements: "/api/announcements",
  about: "/api/site-meta"
};

export function createContentApi(config = window.METERIAL_EXTRA_CONFIG || {}) {
  const baseUrl = String(config.apiBaseUrl || "").replace(/\/$/, "");
  const endpoints = { ...defaultEndpoints, ...(config.endpoints || {}) };
  const mode = baseUrl ? "remote" : "generated";

  function pathFor(name, parameters = {}) {
    const template = endpoints[name];
    if (!template) throw new Error(`Unknown content endpoint: ${name}`);
    return template.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
      if (parameters[key] == null) throw new Error(`Missing endpoint parameter: ${key}`);
      return encodeURIComponent(parameters[key]);
    });
  }

  async function request(name, parameters = {}, query = {}) {
    if (mode !== "remote") return null;
    const url = new URL(baseUrl + pathFor(name, parameters));
    Object.entries(query).forEach(([key, value]) => {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    });
    const response = await fetch(url, {
      headers: { Accept: "application/json", ...(config.requestHeaders || {}) },
      credentials: config.credentials || "same-origin"
    });
    if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
    return response.json();
  }

  return {
    mode,
    endpoints,
    pathFor,
    getPosts: (query) => request("posts", {}, query),
    getPost: (id) => request("post", { id }),
    getArchive: () => request("archive"),
    getFriends: () => request("friends"),
    getAnnouncements: () => request("announcements"),
    getAbout: () => request("about")
  };
}

export const contentApi = createContentApi();
