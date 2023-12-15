import { MapFunction } from "@octokit/plugin-paginate-rest/dist-types/types";
import { getOctokit } from "../http-interfaces";
import { MaybeRefOrGetter, toValue, ref, Ref } from "vue";
import { watchDebounced } from "@vueuse/core";
import type { PaginatingEndpoints } from "@octokit/plugin-paginate-rest/dist-types/generated/paginating-endpoints";

export function useOctokitPaginateMap<R extends keyof PaginatingEndpoints, M extends unknown[]>(
  params: MaybeRefOrGetter<
    Array<[key: string, route: R, parameters: PaginatingEndpoints[R]["parameters"]]>
  >,
  mapFn: MaybeRefOrGetter<MapFunction<PaginatingEndpoints[R]["response"], M>>
) {
  const loading = ref(false);
  const percentage = ref(0);
  const fetchingPart = ref(0);
  const data = ref({}) as Ref<Record<string, M>>;

  watchDebounced(
    [params, mapFn],
    async () => {
      try {
        loading.value = true;
        percentage.value = 0;
        const resultMap: Record<string, M> = {};

        const paramsValue = toValue(params);
        for (let i = 0; i < paramsValue.length; i++) {
          fetchingPart.value = i;
          const [key, route, parameters] = paramsValue[i];
          resultMap[key] = await getOctokit().paginate<R, M>(
            route,
            { ...parameters, pre_page: 100 },
            (response, done) => toValue(mapFn)(response, done)
          );
        }

        data.value = resultMap;
        fetchingPart.value = paramsValue.length;
      } finally {
        loading.value = false;
      }
    },
    { debounce: 480 }
  );

  return {
    loading,
    fetchingPart,
    data,
    percentage
  };
}
