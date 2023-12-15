import { computed, MaybeRefOrGetter, Ref, ref, toValue } from "vue";
import { useOctokitPaginateMap } from "./use-octokit-paginate";
import type { PaginatingEndpoints } from "@octokit/plugin-paginate-rest/dist-types/generated/paginating-endpoints";
import { MapFunction } from "@octokit/plugin-paginate-rest/dist-types/types";

export function useRepositories() {
  const url = "GET /search/repositories" as const;

  const paramsList = ref([]) as Ref<
    Array<
      [key: string, route: typeof url, parameters: PaginatingEndpoints[typeof url]["parameters"]]
    >
  >;
  const fetchRepositories = (searchValue: MaybeRefOrGetter<string>) => {
    paramsList.value = [["repositories", url, { q: toValue(searchValue) }]];
  };

  const mapFn =
    (): MapFunction<PaginatingEndpoints[typeof url]["response"], Array<Repository>> =>
    (response, done) => {
      done();
      return response.data.map(
        (repository) =>
          ({
            owner: {
              login: repository.owner?.login,
              avatar_url: repository.owner?.avatar_url
            },
            name: repository.name,
            full_name: repository.full_name
          }) as Repository
      );
    };
  const result = useOctokitPaginateMap<typeof url, Array<Repository>>(paramsList, mapFn);

  return {
    ...result,
    data: computed(() => result.data.value["repositories"]),
    fetch: fetchRepositories
  };
}

export interface Repository {
  owner: {
    login: string;
    avatar_url: string;
  };
  name: string;
  full_name: string;
}
