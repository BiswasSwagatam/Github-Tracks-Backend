import { Octokit } from "octokit";
import googleTrends from "google-trends-api";

export class GithubData {
  constructor(token) {
    this.octokit = new Octokit({ auth: token });
  }

  async getData(repository) {
    console.log(`Fetching data for ${repository} Repository...`);
    try {
      const [owner, repo] = repository.split("/");
      const { data: repoData } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      // Fetch open issues
      const latestOpenIssues = await this.getLatestOpenIssues(owner, repo);

      // Fetch releases
      const lastReleases = await this.getLastReleases(owner, repo);

      // Fetch languages
      const languages = await this.getLanguages(owner, repo);

      // Fetch contributors count
      const contributors = await this.getContributorsCount(owner, repo);

      // Fetch commits data
      const { commitsPerDay, topContributors } = await this.getCommitsData(
        owner,
        repo
      );

      // Fetch Google Trends data
      const topicInterest = await this.getGoogleTrendsData(repo);

      return {
        repoName: repoData.name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        created_at: repoData.created_at,
        updated_at: repoData.updated_at,
        homepage: repoData.homepage,
        latest_open_issues: latestOpenIssues,
        releases: lastReleases,
        languages,
        contributors,
        latest_release: lastReleases[0]?.release,
        commits_per_day: commitsPerDay,
        top_contributors: topContributors,
        topic_interest: topicInterest,
      };
    } catch (error) {
      throw new Error(`Failed to fetch repository data: ${error.message}`);
    }
  }

  async getLatestOpenIssues(owner, repo) {
    const { data: issues } = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "open",
      per_page: 30,
    });

    return issues.map((issue) => ({
      issue: issue.title,
      user: issue.user.login,
      href: issue.html_url,
    }));
  }

  async getLastReleases(owner, repo) {
    const { data: releases } = await this.octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: 30,
    });

    return releases.map((release) => ({
      release: release.name || release.tag_name,
    }));
  }

  async getLanguages(owner, repo) {
    const { data: repoLanguages } = await this.octokit.rest.repos.listLanguages(
      {
        owner,
        repo,
      }
    );

    return Object.entries(repoLanguages).map(([language, loc]) => ({
      language,
      loc,
    }));
  }

  // async getContributorsCount(owner, repo) {
  //   const { data: contributors } =
  //     await this.octokit.rest.repos.listContributors({
  //       owner,
  //       repo,
  //       // per_page: 100,
  //       // anon: true,
  //     });

  //   return contributors.length;
  // }

  async getContributorsCount(owner, repo) {
    let contributorsCount = 0;
    let page = 1;
    const per_page = 100;

    while (true) {
      try {
        const response = await this.octokit.rest.repos.listContributors({
          owner,
          repo,
          per_page,
          page,
          anon: true,
        });

        const contributors = response.data;
        if (contributors.length === 0) {
          break;
        }

        contributorsCount += contributors.length;
        page++;

        // Check if we've reached the last page
        if (contributors.length < per_page) {
          break;
        }
      } catch (error) {
        console.error("Error fetching contributors:", error);
        break;
      }
    }

    return contributorsCount;
  }

  async getCommitsData(owner, repo) {
    const { data: commits } = await this.octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 100,
    });

    const commitsData = commits
      .filter((commit) => commit.author)
      .map((commit) => ({
        author: commit.author.login,
        date: new Date(commit.commit.author.date).toISOString().split("T")[0],
      }))
      .reverse();

    const commitsPerDay = this.processCommitsPerDay(commitsData);
    const topContributors = this.processTopContributors(commitsData);

    return {
      commitsPerDay,
      topContributors,
    };
  }

  processCommitsPerDay(commitsData) {
    const commitsByDate = commitsData.reduce((acc, { date }) => {
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(commitsByDate).map(([date, commits]) => ({
      date,
      commits,
    }));
  }

  processTopContributors(commitsData) {
    const contributorCommits = commitsData.reduce((acc, { author }) => {
      acc[author] = (acc[author] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(contributorCommits)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([author, commits]) => ({
        author,
        commits,
      }));
  }

  // async getGoogleTrendsData(repoName) {
  //   try {
  //     const result = await new Promise((resolve, reject) => {
  //       googleTrends.interestOverTime(
  //         {
  //           keyword: repoName,
  //           startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  //         },
  //         (err, results) => {
  //           if (err) reject(err);
  //           resolve(results);
  //         }
  //       );
  //     });

  //     const data = JSON.parse(result).default.timelineData;
  //     return data.map((item) => ({
  //       popularity: item.value[0],
  //       date: new Date(item.time * 1000).toISOString().split("T")[0],
  //     }));
  //   } catch (error) {
  //     console.error("Error fetching Google Trends data:", error);
  //     return [];
  //   }
  // }

  // async getGoogleTrendsData(repoName) {
  //   try {
  //     // Set up the options for Google Trends
  //     const options = {
  //       keyword: repoName,
  //       startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
  //       geo: "", // Worldwide
  //       hl: "en-US", // Language
  //     };

  //     // Wrap the googleTrends call in a Promise with proper error handling
  //     const result = await new Promise((resolve, reject) => {
  //       googleTrends.interestOverTime(options, (err, results) => {
  //         if (err) {
  //           reject(err);
  //           return;
  //         }

  //         try {
  //           const parsedResults = JSON.parse(results);
  //           if (
  //             !parsedResults ||
  //             !parsedResults.default ||
  //             !parsedResults.default.timelineData
  //           ) {
  //             reject(new Error("Invalid Google Trends response format"));
  //             return;
  //           }
  //           resolve(parsedResults);
  //         } catch (parseError) {
  //           reject(
  //             new Error(
  //               `Failed to parse Google Trends response: ${parseError.message}`
  //             )
  //           );
  //         }
  //       });
  //     });

  //     // Process the timeline data
  //     const timelineData = result.default.timelineData || [];
  //     return timelineData.map((item) => ({
  //       popularity: item.value[0],
  //       date: new Date(parseInt(item.time) * 1000).toISOString().split("T")[0],
  //     }));
  //   } catch (error) {
  //     console.error("Error fetching Google Trends data:", error);
  //     // Return empty array instead of throwing to prevent the entire request from failing
  //     return [];
  //   }
  // }

  async getGoogleTrendsData(repoName) {
    try {
      const options = {
        keyword: repoName,
        startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        geo: "", // Worldwide
        hl: "en-US", // Language
        returnContent: "json", // Explicitly request JSON response
        timeout: 5000, // Set a timeout for the request
      };

      const result = await new Promise((resolve, reject) => {
        googleTrends.interestOverTime(options, (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          try {
            const parsedResults = JSON.parse(results);
            if (
              !parsedResults ||
              !parsedResults.default ||
              !parsedResults.default.timelineData
            ) {
              reject(new Error("Invalid Google Trends response format"));
              return;
            }
            resolve(parsedResults);
          } catch (parseError) {
            reject(
              new Error(
                `Failed to parse Google Trends response: ${parseError.message}`
              )
            );
          }
        });
      });

      const timelineData = result.default.timelineData || [];
      return timelineData.map((item) => ({
        popularity: item.value[0],
        date: new Date(parseInt(item.time) * 1000).toISOString().split("T")[0],
      }));
    } catch (error) {
      console.error("Error fetching Google Trends data:", error);
      return []; // Return an empty array on error to prevent request failure
    }
  }
}
