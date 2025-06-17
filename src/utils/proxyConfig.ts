export const proxyConfig = {
  // protocol: "http",
  host: process.env.PROXY_HOST,
  port: parseInt(process.env.PROXY_PORT || "0"),
  auth: {
    username: process.env.PROXY_USER || "",
    password: process.env.PROXY_PASS || "",
  },
};
