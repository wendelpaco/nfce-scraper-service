export const proxyConfig = {
  // protocol: "http",
  enabled: true,
  host: process.env.PROXY_HOST,
  port: parseInt(process.env.PROXY_PORT || "0"),
  auth: {
    username: process.env.PROXY_USERNAME || "",
    password: process.env.PROXY_PASSWORD || "",
  },
};
