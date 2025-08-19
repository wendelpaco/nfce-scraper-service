module.exports = {
  apps: [
    {
      name: "nfce-api",
      script: "dist/src/server.js"
    },
    {
      name: "scraper-worker",
      script: "dist/src/workers/scraperWorker.js"
    }
  ]
}