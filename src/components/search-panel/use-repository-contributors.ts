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

  const data = ref<Array<components['schemas']['contributor']>>([]);

  const paramsList = ref([]) as Ref<
    Array<
      [
        key: string,
        route: typeof url,
        parameters: PaginatingEndpoints[typeof url]['parameters']
      ]
    >
  >;
  const page = ref(1);
  const fetchContributors = () => {
    const ownerValue = toValue(owner);
    const repoValue = toValue(repo);
    if (!isString(ownerValue) || !isString(repoValue)) return;

    const pageValue = toValue(page);

    paramsList.value = [
      [
        'contributors',
        url,
        {
          owner: ownerValue,
          repo: repoValue,
          page: pageValue,
        },
      ],
    ];
  };
  const nextPage = () => {
    page.value++;
    fetchContributors();
  };

  const mapFn =
    (): MapFunction<
      PaginatingEndpoints[typeof url]['response'],
      Array<components['schemas']['contributor']>
    > =>
    (response, done) => {
      done();
      data.value = data.value.concat(response.data);
      return response.data;
    };
  const result = useOctokitPaginateMap<
    typeof url,
    Array<components['schemas']['contributor']>
  >(paramsList, mapFn);

  return {
    ...result,
    data,
    fetch: () => {
      page.value = 1;
      data.value = [];
      fetchContributors();
    },
    next: () => nextPage(),
  };
}
