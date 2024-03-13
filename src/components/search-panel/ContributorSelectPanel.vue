<template>
  <q-tabs v-model="formData.tab" inline-label outside-arrows mobile-arrows>
    <q-tab name="rank" label="Select by Rank" />
    <q-tab name="select" label="Select Contributor" />
  </q-tabs>

  <q-tab-panels v-model="formData.tab" animated>
    <q-tab-panel name="rank">
      <q-field
        :loading="loading"
        :label="`Select the first ${formData.rankSize} contributors(sort by commits)`"
        stack-label
      >
        <template v-slot:control>
          <q-slider
            :model-value="formData.rankSize"
            @change="(value) => (formData.rankSize = value)"
            :min="1"
            :max="total"
            label
            :markers="total"
            marker-labels
            class="pr-2"
          >
            <template v-slot:marker-label-group="{ markerList }">
              <div
                v-for="marker in markerList"
                :key="marker.index"
                :class="['text-nowrap', marker.classes]"
                :style="marker.style"
                @click="model = marker.value"
              >
                <template v-if="marker.index === markerList.length - 1">
                  <span class="align-middle">~{{ marker.value }}</span>
                  <q-icon name="mdi-help-circle-outline" class="cursor-help">
                    <q-tooltip max-width="250px"
                      >The maximum value is an estimate. Because the current
                      GitHub does not provide an interface to get the exact
                      number of contributors.
                    </q-tooltip>
                  </q-icon>
                </template>
                <template v-else>{{ marker.value }}</template>
              </div>
            </template>
          </q-slider>
        </template>
      </q-field>
      <div class="w-full relative mt-1 pr-4">
        <span
          class="inline-block"
          v-for="c in contributors"
          :key="c.login"
          :style="{ width: '16px' }"
        >
          <q-avatar size="md" :style="{ border: '1px solid white' }">
            <img :src="c.avatar_url" :alt="c.name" />
          </q-avatar>
        </span>
      </div>
    </q-tab-panel>
    <q-tab-panel name="select">
      <div class="text-xs pl-2 pr-2 mb-2">
        Fetch all contributors and select manually. For
        <strong>large repositories</strong>, it may take a long time.
      </div>

      <q-select
        dense
        :disable="loading"
        filled
        v-model="contributors"
        use-input
        clearable
        input-debounce="250"
        label="Contributors"
        :options="repositoryContributorFilterOptions"
        :loading="loading"
        option-label="login"
        option-value="login"
        use-chips
        multiple
        class="mb-2"
        @filter="filterFn"
      >
        <template #prepend>
          <q-icon name="mdi-account-multiple-outline" />
        </template>
        <template v-slot:no-option>
          <q-item>
            <q-item-section class="text-grey"> No contributors </q-item-section>
          </q-item>
        </template>
        <template v-slot:option="{ itemProps, opt }">
          <q-item v-bind="itemProps">
            <q-item-section>
              <q-item-label class="ellipsis">{{ opt.login }}</q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-avatar>
                <img :src="opt.avatar_url" :alt="opt.login" />
              </q-avatar>
            </q-item-section>
          </q-item>
        </template>
        <template
          v-slot:selected-item="{ removeAtIndex, index, tabindex, opt }"
        >
          <q-chip
            removable
            dense
            @remove="removeAtIndex(index)"
            :tabindex="tabindex"
          >
            <q-avatar color="secondary" text-color="white"
              ><img :src="opt.avatar_url" :alt="opt.login" />
            </q-avatar>
            <span>{{ opt.login }} </span>
          </q-chip>
        </template>
      </q-select>
    </q-tab-panel>
  </q-tab-panels>
</template>

<script setup lang="ts">
import { ref, PropType, computed, toRefs, reactive, toRaw, watch } from 'vue';
import { Contributor } from 'components/search-panel/models';
import { QSelect } from 'quasar';
import { useRepositoryContributors } from 'components/search-panel/use-repository-contributors';
import { Repository } from 'components/search-panel/use-repositories';
import { useCommitStore } from 'stores/commit-store';
import { storeToRefs } from 'pinia';
import { cloneDeep } from 'lodash-es';
import { until, watchDebounced } from '@vueuse/core';

const commitsStore = useCommitStore();
const { contributorSearchParams } = storeToRefs(commitsStore);

const props = defineProps({
  repository: {
    type: Object as PropType<Repository>,
    required: true,
  },
  contributors: {
    type: Array as PropType<Array<Contributor>>,
    required: true,
  },
});

const { repository } = toRefs(props);

const emits = defineEmits<{
  (event: 'update:contributors', value: Array<Contributor>): void;
}>();

const contributors = computed({
  get: () => props.contributors,
  set: (value: Array<Contributor>) => emits('update:contributors', value),
});

const { fetch, total, fetchingPart, data, loading, percentage } =
  useRepositoryContributors(
    computed(() => repository.value.owner.login),
    computed(() => repository.value.name)
  );

const formData = reactive(cloneDeep(toRaw(contributorSearchParams.value)));
watchDebounced(
  () => ({ rankSize: formData.rankSize, tab: formData.tab }),
  async ({ tab, rankSize }) => {
    contributors.value = [];

    switch (tab) {
      case 'rank':
        await fetch(rankSize);
        await until(loading).toBe(false);
        contributors.value = data.value;
        break;
      case 'select':
        await fetch();
        break;
    }
    console.log(contributors.value?.length);
    commitsStore.updateContributorSearchParams({ tab, rankSize });
  },
  { debounce: 250, immediate: true }
);

// contributor select 过滤
const repositoryContributorSearchValue = ref('');
const repositoryContributorFilterOptions = computed<Array<Contributor>>(() => {
  const searchValue = repositoryContributorSearchValue.value.toLowerCase();
  if (searchValue.length <= 0) {
    return data.value;
  } else {
    return data.value.filter(
      (c) => (c.login ?? '').toLowerCase().indexOf(searchValue) > -1
    );
  }
});
function filterFn(val: string, doneFn: () => void, abort: () => void) {
  repositoryContributorSearchValue.value = val;
  doneFn();
}
</script>

<style lang="scss" scoped></style>
