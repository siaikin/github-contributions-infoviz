export * from "./octokit";

import { getOctokit } from "./octokit.ts";

export async function getUser(username: string) {
  return getOctokit().request("GET /users/{username}", {
    username: username
  });
}

export async function getRepositories(username: string) {
  return getOctokit().request("GET /users/{username}/repos", {
    username: username,
    type: "all",
    per_page: 100
  });
}

export async function searchRepositories(searchValue: string) {
  return getOctokit().request("GET /search/repositories", {
    q: searchValue,
    per_page: 100
  });
}

export async function getGitTree(
  owner: string,
  repo: string,
  tree_sha: string,
  recursive: boolean = true
) {
  return getOctokit().request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
    owner,
    repo,
    tree_sha,
    recursive: recursive.toString()
  });
}

export async function getGitReferences(owner: string, repo: string, ref: "heads/" | "tags/") {
  return getOctokit().request("GET /repos/{owner}/{repo}/git/matching-refs/{ref}", {
    owner,
    repo,
    ref,
    per_page: 100
  });
}

export async function getRepositoryReleases(owner: string, repo: string) {
  return getOctokit().request("GET /repos/{owner}/{repo}/releases", {
    owner,
    repo
  });
}

export async function getRepositoryContributors(owner: string, repo: string) {
  return getOctokit().request("GET /repos/{owner}/{repo}/contributors", {
    owner,
    repo,
    per_page: 100
  });
}

export async function getRepositoryCollaborators(owner: string, repo: string) {
  return getOctokit().request("GET /repos/{owner}/{repo}/collaborators", {
    owner,
    repo,
    per_page: 100
  });
}
