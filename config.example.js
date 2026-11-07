/**
 * Copy the required values into config.js.
 *
 * No production API address, credential, private image URL, or article is
 * included in this repository. The route names below are templates only.
 */
window.METERIAL_EXTRA_CONFIG = {
  // Leave empty to use the generated demo adapter.
  apiBaseUrl: "https://your-api.example.com",
  contentMode: "remote",
  endpoints: {
    posts: "/api/posts",
    post: "/api/posts/:id",
    archive: "/api/archive",
    friends: "/api/friends",
    announcements: "/api/announcements",
    about: "/api/site-meta"
  },
  requestHeaders: {
    Accept: "application/json"
    // Add your own public client identifier only if your backend requires it.
    // Never place secrets in frontend JavaScript.
  }
};
