import { computed, MaybeRefOrGetter, Ref, ref, toValue } from 'vue';
import { useOctokitPaginateMap } from './use-octokit-paginate';
import type { PaginatingEndpoints } from '@octokit/plugin-paginate-rest/dist-types/generated/paginating-endpoints';
import { MapFunction } from '@octokit/plugin-paginate-rest/dist-types/types';
import { components } from '@octokit/openapi-types/types';
import { isString } from 'lodash-es';
import { parseLinkHeader } from 'src/http-interfaces/parse-link-header';
import { until } from '@vueuse/core';

export function useRepositoryContributors(
  owner: MaybeRefOrGetter<string | undefined>,
  repo: MaybeRefOrGetter<string | undefined>
) {
  const url = 'GET /repos/{owner}/{repo}/contributors' as const;

  const total = ref(0);
  const expectedCount = ref(0);
  const remainedCount = ref(0);

  const paramsList = ref([]) as Ref<
    Array<
      [
        key: string,
        route: typeof url,
        parameters: PaginatingEndpoints[typeof url]['parameters']
      ]
    >
  >;
  const fetchContributors = async (expected: number) => {
    const ownerValue = toValue(owner);
    const repoValue = toValue(repo);
    if (!isString(ownerValue) || !isString(repoValue)) return;

    expectedCount.value = expected;
    remainedCount.value = expected;
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

    await until(result.loading).toBe(true);
  };

  const mapFn =
    (): MapFunction<
      PaginatingEndpoints[typeof url]['response'],
      Array<components['schemas']['contributor']>
    > =>
    (response, done) => {
      const linkMap = parseLinkHeader(response.headers.link);
      total.value = Math.max(
        total.value,
        Number.parseInt(linkMap?.last?.page ?? '0') *
          Number.parseInt(linkMap?.last?.per_page ?? '0') || 0
      );

      remainedCount.value -= response.data.length;
      if (remainedCount.value <= 0) done();

      return response.data;
    };
  const result = useOctokitPaginateMap<
    typeof url,
    Array<components['schemas']['contributor']>
  >(paramsList, mapFn);

  return {
    ...result,
    data: computed(() =>
      (result.data.value['contributors'] ?? []).slice(0, expectedCount.value)
    ),
    total,
    fetch: (expected: number = Number.MAX_VALUE) => fetchContributors(expected),
  };
}
