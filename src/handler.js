const { Router } = require("express");
const util = require("./util");
const getUserResources = require("./functions/getUserResources");

const router = Router();
const settings = util.loadSettings();
const { pages } = util.loadPages(settings.website.theme);

router.get("*", async (req, res) => {
  if (req.url === "/") return res.redirect("/login");
  if (req.url === "/logout") {
    if (req.session.data) delete req.session.data;
    if (req.session.variables) delete req.session.variables;
    return req.session.destroy(() => res.redirect("/home"));
  }

  const { query } = req;
  const variables = {};
  const path = req.url.slice(1).split("?")[0];
  const page = pages[path];
  if (!page)
    return res.status(404).render(pages.error404.file, {
      data: req.session.data,
      query,
      variables,
    });

  switch (page.permission) {
    case 0:
      break;
    case 1: {
      if (!req.session.data?.user_info) return res.redirect("/login");
      break;
    }
    case 2: {
      if (!req.session.data?.panel_info) return res.redirect("/login");
      if (!req.session.data.panel_info.root_admin) {
        return res.status(403).render(pages.error403.file, {
          data: req.session?.data,
          query,
          variables,
        });
      }
      break;
    }
    default: {
      console.log(
        `[WEB] Path: '${path}' permission value is invalid. ` +
          "Permission must be 0 (everyone), 1 (logged in), or 2 (administrator)."
      );
      return res
        .status(500)
        .send(
          "An error has occured while attempting to load this page. " +
            "Please contact an administrator to fix this."
        );
    }
  }

  if (page.permission === 0)
    return res.render(page.file, { data: req.session.data, query, variables });

  const resources = await getUserResources(req);
  if (resources === "noPackage") {
    const serverInvite = settings.discord.invite || "notSet";
    return res.status(500).render(pages.error500.file, {
      error:
        "The package assigned to your account does not match any packages in the database.",
      serverInvite,
    });
  }

  variables.variables = req.session.variables;
  variables.data = req.session.data;
  variables.settings = settings;

  if (!resources) {
    variables.packageInfo = 0;
    variables.current = 0;
    variables.extra = {
      memory: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
    };
    variables.total = {
      memory: 0,
      disk: 0,
      cpu: 0,
      servers: 0,
    };
  } else {
    Object.assign(variables, resources);
  }
  variables.timers = {};

  if (req.session.variables) delete req.session.variables;
  res.render(page.file, variables);
});

module.exports = router;
