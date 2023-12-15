import { computed, MaybeRefOrGetter, Ref, ref, toValue } from "vue";
import { useOctokitPaginateMap } from "./use-octokit-paginate";
import { typeIsArray, typeIsString } from "@siaikin/utils";
import type { PaginatingEndpoints } from "@octokit/plugin-paginate-rest/dist-types/generated/paginating-endpoints";
import { MapFunction } from "@octokit/plugin-paginate-rest/dist-types/types";

export function useGitCommit(
  username: MaybeRefOrGetter<string | undefined>,
  repository: MaybeRefOrGetter<string | undefined>,
  branches: MaybeRefOrGetter<Array<string>>,
  tags: MaybeRefOrGetter<Array<string>>,
  contributors: MaybeRefOrGetter<Array<string>>,
  collaborators: MaybeRefOrGetter<Array<string>>,
  dateRange: MaybeRefOrGetter<[string, string] | undefined>,
  tab: MaybeRefOrGetter<"branch" | "contributor" | "collaborator" | undefined>
) {
  console.log(tags);
  const url = "GET /repos/{owner}/{repo}/commits" as const;
  const paramsList = ref([]) as Ref<
    Array<
      [key: string, route: typeof url, parameters: PaginatingEndpoints[typeof url]["parameters"]]
    >
  >;

  const fetchCommits = () => {
    const repositoryValue = toValue(repository);
    const usernameValue = toValue(username);
    if (!typeIsString(repositoryValue) || !typeIsString(usernameValue)) return;

    const dateRangeValue = toValue(dateRange);
    if (!typeIsArray(dateRangeValue) || dateRangeValue.length !== 2) return;

    const tabValue = toValue(tab);

    const basicParams: PaginatingEndpoints[typeof url]["parameters"] = {
      owner: usernameValue,
      repo: repositoryValue,
      since: dateRangeValue[0],
      until: dateRangeValue[1]
    };

    const result: Array<
      [key: string, route: typeof url, parameters: PaginatingEndpoints[typeof url]["parameters"]]
    > = [];

    switch (tabValue) {
      case "branch": {
        // 传空字符串 "" 使用默认分支
        const branchRefs = toValue(branches).length <= 0 ? [""] : toValue(branches);
        for (let i = 0; i < branchRefs.length; i++) {
          const ref = branchRefs[i];

          result.push([ref, url, { ...basicParams, sha: ref }]);
        }
        break;
      }
      case "contributor": {
        const contributorLogins = toValue(contributors) ?? [];
        for (let i = 0; i < contributorLogins.length; i++) {
          const login = contributorLogins[i];

          result.push([login, url, { ...basicParams, author: login }]);
        }
        break;
      }
      case "collaborator": {
        const collaboratorLogins = toValue(collaborators) ?? [];
        for (let i = 0; i < collaboratorLogins.length; i++) {
          const login = collaboratorLogins[i];

          result.push([login, url, { ...basicParams, author: login }]);
        }
        break;
      }
    }

    paramsList.value = result;
  };

  const mapFn =
    (): MapFunction<PaginatingEndpoints[typeof url]["response"], Array<RepositoryCommit>> =>
    (response) => {
      return response.data.map(
        (commit) =>
          ({
            author: commit.commit.author,
            committer: commit.commit.committer,
            message: commit.commit.message!
          }) as RepositoryCommit
      );
    };
  const result = useOctokitPaginateMap<typeof url, Array<RepositoryCommit>>(paramsList, mapFn);
  const loadingText = computed(() => {
    const fetchingIndex = result.fetchingPart.value;
    const paramsListValue = paramsList.value;
    if (fetchingIndex >= paramsListValue.length) return "Done";

    const tabValue = toValue(tab);
    const [key] = paramsListValue[fetchingIndex];
    switch (tabValue) {
      case "branch":
        return `Fetching branch ${key.length <= 0 ? "default" : key}`;
      case "contributor":
        return `Fetching contributor ${key}`;
      case "collaborator":
        return `Fetching collaborator ${key}`;
      default:
        return "Loading";
    }
  });
  const commitCount = computed(() => {
    return Object.values(result.data.value).reduce((acc, cur) => acc + cur.length, 0);
  });

  return { ...result, commitCount, loadingText, fetch: fetchCommits };
}

export interface RepositoryCommit {
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  message: string;
}
