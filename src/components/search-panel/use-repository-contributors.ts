import { computed, MaybeRefOrGetter, Ref, ref, toValue } from 'vue';
import { useOctokitPaginateMap } from './use-octokit-paginate';
import type { PaginatingEndpoints } from '@octokit/plugin-paginate-rest/dist-types/generated/paginating-endpoints';
import { MapFunction } from '@octokit/plugin-paginate-rest/dist-types/types';
import { components } from '@octokit/openapi-types/types';
import { isString } from 'lodash-es';

export function useRepositoryContributors(
  owner: MaybeRefOrGetter<string | undefined>,
  repo: MaybeRefOrGetter<string | undefined>
) {
  const url = 'GET /repos/{owner}/{repo}/contributors' as const;

  const paramsList = ref([]) as Ref<
    Array<
      [
        key: string,
        route: typeof url,
        parameters: PaginatingEndpoints[typeof url]['parameters']
      ]
    >
  >;
  const fetchContributors = () => {
    const ownerValue = toValue(owner);
    const repoValue = toValue(repo);
    if (!isString(ownerValue) || !isString(repoValue)) return;

    paramsList.value = [
      [
        'contributors',
        url,
        {
          owner: ownerValue,
          repo: repoValue,
        },
      ],
    ];
  };

  const mapFn =
    (): MapFunction<
      PaginatingEndpoints[typeof url]['response'],
      Array<components['schemas']['contributor']>
    > =>
    (response) =>
      response.data.map((repository) => repository);
  const result = useOctokitPaginateMap<
    typeof url,
    Array<components['schemas']['contributor']>
  >(paramsList, mapFn);

  return {
    ...result,
    data: computed(() => result.data.value['contributors']),
    fetch: fetchContributors,
  };
}
