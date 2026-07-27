import { Type } from "@google/genai";
import { Tool } from "../Tool.js";
import {
  initPortfolio,
  portfolioList,
  updatePortfolioHero,
  updatePortfolioProjects,
  isApiError,
} from "../../api.js";


// ---------------------------------------------------------------------------
// Tool: list_portfolios
// ---------------------------------------------------------------------------

export const ListPortfoliosTool: Tool = {
  name: "list_portfolios",
  description: `List all portfolios the user has on CareerVivid.
Use this first when the user asks to update, view, or manage their portfolio.
Returns portfolio IDs and live URLs so the agent can call update_portfolio_hero
or update_portfolio_projects with the correct portfolioId.`,
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
  execute: async () => {
    const result = await portfolioList();

    if (isApiError(result)) {
      return `❌ Could not fetch portfolios: ${result.message}`;
    }

    const list = result.portfolios ?? [];
    if (list.length === 0) {
      return `You have no portfolios yet. Use init_portfolio to create one.`;
    }

    const lines = list.map(
      (p, i) =>
        `${i + 1}. "${p.title}" [ID: ${p.id}]\n   🔗 ${p.url}\n   Updated: ${p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "Unknown"}`
    );
    return `You have ${list.length} portfolio(s) on CareerVivid:\n\n${lines.join("\n\n")}`;
  },
};

// ---------------------------------------------------------------------------
// Tool: init_portfolio
// ---------------------------------------------------------------------------

export const InitPortfolioTool: Tool = {
  name: "init_portfolio",
  description: `Create a new portfolio on CareerVivid.
Use this when the user asks to create a new portfolio or has none yet.
Returns the portfolioId and a live URL where the portfolio can be viewed.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Title for the portfolio, e.g. 'Jiawen Zhu — Full-Stack Engineer'",
      },
      templateId: {
        type: Type.STRING,
        description: "Optional template ID (e.g. 'software_engineer', 'minimal').",
      },
    },
    required: ["title"],
  },
  execute: async (args: { title: string; templateId?: string }) => {
    const result = await initPortfolio(args.title, args.templateId);

    if (isApiError(result)) {
      return `❌ Failed to create portfolio: ${result.message}`;
    }

    return [
      `✅ Portfolio created: "${args.title}"`,
      `Portfolio ID: ${result.portfolioId}`,
      `🔗 Live URL: ${result.url}`,
      ``,
      `Next: call update_portfolio_hero or update_portfolio_projects with portfolioId="${result.portfolioId}".`,
    ].join("\n");
  },
};

// ---------------------------------------------------------------------------
// Tool: update_portfolio_hero
// ---------------------------------------------------------------------------

export const UpdatePortfolioHeroTool: Tool = {
  name: "update_portfolio_hero",
  description: `Update the hero / header section of the user's live CareerVivid portfolio.
Call list_portfolios first to get the correct portfolioId.
Use this to set the headline, bio, avatar, social links, and CTA button.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      portfolioId: {
        type: Type.STRING,
        description: "ID of the portfolio to update. Get from list_portfolios.",
      },
      headline: { type: Type.STRING, description: "Main hero headline (job title / positioning)." },
      subheadline: { type: Type.STRING, description: "Subtitle shown below the headline." },
      bio: { type: Type.STRING, description: "Short bio / about text (2-4 sentences)." },
      avatarUrl: { type: Type.STRING, description: "URL to the user's profile photo." },
      ctaLabel: { type: Type.STRING, description: "Primary CTA button text." },
      ctaUrl: { type: Type.STRING, description: "Primary CTA button URL." },
      linkedin: { type: Type.STRING, description: "LinkedIn profile URL." },
      github: { type: Type.STRING, description: "GitHub profile URL." },
      website: { type: Type.STRING, description: "Personal website URL." },
    },
    required: ["portfolioId"],
  },
  execute: async (args: {
    portfolioId: string;
    headline?: string;
    subheadline?: string;
    bio?: string;
    avatarUrl?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  }) => {
    const { portfolioId, ...rest } = args;
    const hero: Record<string, any> = {};
    if (rest.headline) hero.headline = rest.headline;
    if (rest.subheadline) hero.subheadline = rest.subheadline;
    if (rest.bio) hero.bio = rest.bio;
    if (rest.avatarUrl) hero.avatarUrl = rest.avatarUrl;
    if (rest.ctaLabel) hero.ctaLabel = rest.ctaLabel;
    if (rest.ctaUrl) hero.ctaUrl = rest.ctaUrl;

    const socialLinks: Record<string, string> = {};
    if (rest.linkedin) socialLinks.linkedin = rest.linkedin;
    if (rest.github) socialLinks.github = rest.github;
    if (rest.website) socialLinks.website = rest.website;
    if (Object.keys(socialLinks).length > 0) hero.socialLinks = socialLinks;

    const result = await updatePortfolioHero(portfolioId, hero);

    if (isApiError(result)) {
      return `❌ Failed to update portfolio hero: ${result.message}`;
    }

    return [
      `✅ Portfolio hero updated!`,
      `Changed: ${Object.keys(hero).join(", ")}`,
      `🔗 View live: https://careervivid.app/portfolio/${portfolioId}`,
    ].join("\n");
  },
};

// ---------------------------------------------------------------------------
// Tool: update_portfolio_projects
// ---------------------------------------------------------------------------

export const UpdatePortfolioProjectsTool: Tool = {
  name: "update_portfolio_projects",
  description: `Update the projects / experience section of the user's live CareerVivid portfolio.
Call list_portfolios first to get the correct portfolioId.
Each project needs at minimum a title and description.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      portfolioId: {
        type: Type.STRING,
        description: "ID of the portfolio to update. Get from list_portfolios.",
      },
      projects: {
        type: Type.ARRAY,
        description: "Array of project/experience objects.",
        items: {
          type: Type.OBJECT,
          properties: {
            title:       { type: Type.STRING },
            description: { type: Type.STRING },
            company:     { type: Type.STRING },
            url:         { type: Type.STRING },
            startDate:   { type: Type.STRING },
            endDate:     { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["title", "description"],
        },
      },
      techStack: {
        type: Type.ARRAY,
        description: "Global skills/tech stack badges for the portfolio.",
        items: { type: Type.STRING },
      },
    },
    required: ["portfolioId", "projects"],
  },
  execute: async (args: {
    portfolioId: string;
    projects: Array<{
      title: string;
      description: string;
      company?: string;
      url?: string;
      startDate?: string;
      endDate?: string;
      tags?: string[];
    }>;
    techStack?: string[];
  }) => {
    const result = await updatePortfolioProjects(
      args.portfolioId,
      args.projects,
      args.techStack
    );

    if (isApiError(result)) {
      return `❌ Failed to update portfolio projects: ${result.message}`;
    }

    return [
      `✅ Portfolio updated with ${args.projects.length} project(s)!`,
      `🔗 View live: https://careervivid.app/portfolio/${args.portfolioId}`,
    ].join("\n");
  },
};

// ---------------------------------------------------------------------------
// All portfolio tools bundle
// ---------------------------------------------------------------------------

export const ALL_PORTFOLIO_TOOLS: Tool[] = [
  ListPortfoliosTool,
  InitPortfolioTool,
  UpdatePortfolioHeroTool,
  UpdatePortfolioProjectsTool,
];
