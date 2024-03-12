import { MapFunction } from '@octokit/plugin-paginate-rest/dist-types/types';
import { getOctokit } from 'src/http-interfaces';
import { MaybeRefOrGetter, toValue, ref, Ref, watch } from 'vue';
import type { PaginatingEndpoints } from '@octokit/plugin-paginate-rest/dist-types/generated/paginating-endpoints';

export function useOctokitPaginateMap<
  R extends keyof PaginatingEndpoints,
  M extends unknown[]
>(
  params: MaybeRefOrGetter<
    Array<
      [key: string, route: R, parameters: PaginatingEndpoints[R]['parameters']]
    >
  >,
  mapFn: MaybeRefOrGetter<MapFunction<PaginatingEndpoints[R]['response'], M>>
) {
  const loading = ref(false);
  const percentage = ref(0);
  const fetchingPart = ref(0);
  const data = ref({}) as Ref<Record<string, M>>;

  const abortController = ref(new AbortController());

  watch([params, mapFn], async () => {
    loading.value = true;
    data.value = {};
    percentage.value = 0;
    if (abortController.value) abortController.value.abort();
    abortController.value = new AbortController();

    try {
      const resultMap: Record<string, M> = {};

      const paramsValue = toValue(params);
      for (let i = 0; i < paramsValue.length; i++) {
        fetchingPart.value = i;
        percentage.value = Math.floor(((i + 1) / paramsValue.length) * 100);
        const [key, route, parameters] = paramsValue[i];
        resultMap[key] = await getOctokit().paginate<R, M>(
          route,
          {
            ...parameters,
            per_page: 100,
            request: { signal: abortController.value.signal },
          },
          (response, done) => toValue(mapFn)(response, done)
        );
      }

      data.value = resultMap;
      fetchingPart.value = paramsValue.length;
      percentage.value = 100;
    } finally {
      loading.value = false;
    }
  });

  return {
    loading,
    fetchingPart,
    data,
    percentage,
  };
}
