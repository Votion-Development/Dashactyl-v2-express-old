const config = {
  dashboardName: "", // Your dashboards name
  web: {
      url: "", // The URL of your dashboard
      secret: "" // Make this very secure and random
  },
  discord: {
      id: "", // The OAuth2 application ID
      secret: "", // The OAuth2 Application Secret
      callbackpath: "", // Callback URL from discord
      token: "" // Discord bot token
  },
  discordUrl: "", // Oauth URL
  db: {
      connectionString: "" // MongoDB Connection String
  }
};

export default config;