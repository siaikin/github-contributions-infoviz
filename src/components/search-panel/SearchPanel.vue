<template>
  <div class="flex flex-col h-full w-full">
    <q-form
      class="flex-auto h-0 w-full overflow-auto"
      @submit="handleCommitsFetch"
    >
      <q-select
        filled
        v-model="formData.repository"
        use-input
        input-debounce="250"
        label="Repository"
        :options="repositories.data.value"
        :loading="repositories.loading.value"
        @filter="handleRepositoryFetch"
        class="mb-2"
      >
        <template #prepend>
          <q-icon name="mdi-source-repository" />
        </template>
        <template v-slot:no-option>
          <q-item>
            <q-item-section class="text-grey"> No results </q-item-section>
          </q-item>
        </template>
        <template v-slot:option="{ itemProps, opt }">
          <q-item v-bind="itemProps">
            <q-item-section>
              <q-item-label class="ellipsis">{{ opt.full_name }}</q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-avatar>
                <img :src="opt.owner.avatar_url" :alt="opt.owner.login" />
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
            <q-avatar color="secondary" text-color="white">
              <img :src="opt.owner.avatar_url" :alt="opt.owner.login" />
            </q-avatar>
            <span class="ellipsis">
              {{ opt.full_name }}
            </span>
          </q-chip>
        </template>
      </q-select>

      <div class="text-xs pl-2 pr-2 mb-2">
        See "<a
          href="http://docs.github.com/articles/searching-for-repositories/"
          target="_blank"
          >Searching for repositories</a
        >" for a detailed list of qualifiers.
      </div>

      <div class="mb-2">
        <q-input label="Time range" filled :model-value="formData.dateRange">
          <template #append>
            <q-btn icon="event" round color="primary">
              <q-popup-proxy cover>
                <q-date
                  :model-value="{
                    from: formData.dateRange?.[0],
                    to: formData.dateRange?.[1],
                  }"
                  @update:model-value="handleDateRangeChange"
                  range
                  landscape
                  mask="YYYY-MM-DD"
                >
                  <q-chip
                    dense
                    size="sm"
                    :disable="!repositorySelected"
                    v-for="item in presetDateRange"
                    :key="item.label"
                    :selected="
                      formData.dateRange[0] === item.value[0] &&
                      formData.dateRange[1] === item.value[1]
                    "
                    @update:selected="
                      handleDateRangeChange({
                        from: item.value[0],
                        to: item.value[1],
                      })
                    "
                  >
                    {{ item.label }}
                  </q-chip>
                  <div class="row items-center justify-end">
                    <q-btn v-close-popup label="Close" color="primary" flat />
                  </div>
                </q-date>
              </q-popup-proxy>
            </q-btn>
          </template>
        </q-input>
      </div>

      <q-separator />

      <q-tabs v-model="formData.tab" inline-label outside-arrows mobile-arrows>
        <!--        <q-tab :disable="!repositorySelected" name="branch" label="branch" />-->
        <!--        <q-tab :disable="!repositorySelected" name="tag" label="tag" />-->
        <q-tab
          :disable="!repositorySelected"
          name="contributor"
          label="contributor"
        />
        <!--        <q-tab-->
        <!--          :disable="!repositorySelected"-->
        <!--          name="collaborator"-->
        <!--          label="collaborator"-->
        <!--        />-->
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="formData.tab" animated>
        <q-tab-panel name="branch">
          <q-select
            dense
            :disable="!repositorySelected"
            filled
            v-model="formData.branches"
            use-input
            :clearable="true"
            input-debounce="250"
            label="Branches"
            :options="gitBranch.branches"
            :loading="gitBranch.loading"
            option-label="ref"
            option-value="ref"
            use-chips
            multiple
            placeholder="default: repository's default branch"
            class="mb-2"
          >
            <template #prepend>
              <q-icon name="mdi-source-branch" />
            </template>
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> No results </q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-tab-panel>

        <q-tab-panel name="tag">
          <q-select
            dense
            :disable="!repositorySelected"
            filled
            v-model="formData.tags"
            use-input
            :clearable="true"
            input-debounce="250"
            label="Tags"
            :options="gitTag.tags"
            :loading="gitTag.loading"
            option-label="ref"
            option-value="ref"
            use-chips
            multiple
            placeholder="default: repository's default branch"
            class="mb-2"
          >
            <template #prepend>
              <q-icon name="mdi-source-tag" />
            </template>
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> No tags </q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-tab-panel>

        <q-tab-panel name="contributor">
          <q-select
            dense
            :disable="
              !repositorySelected || repositoryContributor.loading.value
            "
            filled
            v-model="formData.contributors"
            use-input
            :clearable="true"
            input-debounce="250"
            label="Contributors"
            :options="repositoryContributorFilterOptions"
            :loading="repositoryContributor.loading.value"
            option-label="login"
            option-value="login"
            use-chips
            multiple
            class="mb-2"
            @filter="filterFn"
            @virtual-scroll="onScroll"
          >
            <template #prepend>
              <q-icon name="mdi-account-multiple-outline" />
            </template>
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">
                  No contributors
                </q-item-section>
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
                <q-avatar color="secondary" text-color="white">
                  <img :src="opt.avatar_url" :alt="opt.login" />
                </q-avatar>
                <span>
                  {{ opt.login }}
                </span>
              </q-chip>
            </template>
          </q-select>
        </q-tab-panel>

        <q-tab-panel name="collaborator">
          <q-select
            :disable="!repositorySelected"
            filled
            v-model="formData.collaborators"
            use-input
            :clearable="true"
            input-debounce="250"
            label="Contributors"
            :options="repositoryCollaborator.collaborators"
            :loading="repositoryCollaborator.loading"
            option-label="login"
            option-value="login"
            use-chips
            multiple
            class="mb-2"
          >
            <template #prepend>
              <q-icon name="mdi-account-multiple-outline" />
            </template>
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">
                  No collaborators
                </q-item-section>
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
                <q-avatar color="secondary" text-color="white">
                  <img :src="opt.avatar_url" :alt="opt.login" />
                </q-avatar>
                <span>
                  {{ opt.login }}
                </span>
              </q-chip>
            </template>
          </q-select>
        </q-tab-panel>
      </q-tab-panels>

      <div class="sticky bottom-0">
        <q-btn
          class="w-full"
          :disable="!repositorySelected"
          square
          label="OK"
          type="submit"
          color="primary"
          :loading="commits.loading.value"
          :percentage="commits.percentage.value"
          :no-caps="true"
        >
          <template v-slot:loading>
            <div class="flex flex-nowrap w-full p-1 gap-1">
              <q-spinner-hourglass />
              <span class="truncate">
                {{ commits.loadingText.value }}
              </span>
              <q-space />
              <span>{{ commits.percentage.value }}%</span>
            </div>
          </template>
        </q-btn>
      </div>
    </q-form>

    <div class="flex-none w-full">
      <q-bar dense>
        <q-space />
        <q-btn flat dense icon="mdi-account-multiple-outline" />
        <span>{{ formData.contributors.length }}</span>
        <q-icon name="mdi-source-commit" />
        <span>{{ commits.commitCount.value }}</span>
      </q-bar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, toRaw, watch } from 'vue';
import {
  getGitReferences,
  getRepositoryCollaborators,
} from 'src/http-interfaces';
import { useGitCommit } from './use-git-commit';
import { until, watchDebounced } from '@vueuse/core';
import { cloneDeep, isNil, isString } from 'lodash-es';
import { useRepositories } from './use-repositories';
import { useCommitStore } from 'stores/commit-store';
import { presetDateRange } from 'components/search-panel/models';
import { storeToRefs } from 'pinia';
import { useRepositoryContributors } from 'components/search-panel/use-repository-contributors';
import { components } from '@octokit/openapi-types';
import { QSelect } from 'quasar';

const commitsStore = useCommitStore();
const { searchParams } = storeToRefs(commitsStore);

const formData = reactive(cloneDeep(toRaw(searchParams.value)));
watch(
  () => formData.repository,
  () => {
    formData.branches = [];
    formData.tags = [];
    formData.contributors = [];
    formData.collaborators = [];
  }
);

const repositorySelected = computed(() => !isNil(formData.repository));

const repositories = useRepositories();

const gitBranch = reactive({
  branches: [] as Awaited<ReturnType<typeof getGitReferences>>['data'],
  loading: false,
});
const gitTag = reactive({
  tags: [] as Awaited<ReturnType<typeof getGitReferences>>['data'],
  loading: false,
});
const repositoryContributor = useRepositoryContributors(
  computed(() => formData.repository?.owner.login),
  computed(() => formData.repository?.name)
);
// const repositoryContributor = reactive({
//   contributors: [] as Awaited<
//     ReturnType<typeof getRepositoryContributors>
//   >['data'],
//   loading: false,
// });
const repositoryCollaborator = reactive({
  collaborators: [] as Awaited<
    ReturnType<typeof getRepositoryCollaborators>
  >['data'],
  loading: false,
});

watchDebounced(
  () => ({ repository: formData.repository, tab: formData.tab }),
  async ({ repository, tab }) => {
    if (isNil(repository) || !isString(tab)) return;

    switch (tab) {
      case 'branch':
        gitBranch.loading = true;
        gitBranch.branches = (
          await getGitReferences(
            repository.owner.login,
            repository.name,
            'heads/'
          )
        ).data;
        gitBranch.loading = false;
        break;
      // case "tag":
      //   gitTag.loading = true;
      //   gitTag.tags = (await getGitReferences(user.name!, repository.name, "tags/")).data;
      //   gitTag.loading = false;
      //   break;
      case 'contributor':
        repositoryContributor.fetch();
        break;
      case 'collaborator':
        repositoryCollaborator.loading = true;
        repositoryCollaborator.collaborators = (
          await getRepositoryCollaborators(
            repository.owner.login,
            repository.name
          )
        ).data;
        repositoryCollaborator.loading = false;
        break;
    }
  },
  { debounce: 480, immediate: true }
);

const commits = useGitCommit(
  computed(() => formData.repository?.owner.login),
  computed(() => formData.repository?.name),
  computed(() => formData.branches?.map((item) => item.ref) ?? []),
  computed(() => formData.tags?.map((item) => item.ref) ?? []),
  computed(() => formData.contributors?.map((item) => item.login ?? '') ?? []),
  computed(() => formData.collaborators?.map((item) => item.login) ?? []),
  computed(() => formData.dateRange),
  computed(() => formData.tab)
);
commits.data.value = commitsStore.commits;

async function handleRepositoryFetch(
  inputValue: string,
  doneFn: () => void,
  abort: () => void
) {
  repositories.searchValue.value = inputValue;
  repositories.fetch();
  await until(repositories.loading).toBe(false);
  doneFn();
}

async function handleCommitsFetch() {
  await commits.fetch();
  await until(commits.loading).toBe(false);

  commitsStore.updateSearchParams({ ...toRaw(formData) });
  commitsStore.updateCommits(commits.data.value);
}

function handleDateRangeChange(value: { from: string; to: string }) {
  formData.dateRange = [value.from, value.to];
}

const repositoryContributorFilterOptions = ref<
  Array<components['schemas']['contributor']>
>([]);
function filterFn(val: string, doneFn: () => void, abort: () => void) {
  if (val.length <= 0) {
    repositoryContributorFilterOptions.value = repositoryContributor.data.value;
  } else {
    const needle = val.toLowerCase();
    repositoryContributorFilterOptions.value =
      repositoryContributor.data.value.filter(
        (c) => (c.login ?? '').toLowerCase().indexOf(needle) > -1
      );
  }
  doneFn();
}

async function onScroll({
  to,
  ref,
}: {
  /**
   * Index of the list item that was scrolled into view (0 based)
   */
  index: number;
  /**
   * The index of the first list item that is rendered (0 based)
   */
  from: number;
  /**
   * The index of the last list item that is rendered (0 based)
   */
  to: number;
  /**
   * Direction of change
   */
  direction: 'increase' | 'decrease';
  /**
   * Vue reference to the QSelect
   */
  ref: QSelect;
}) {
  const lastIndex = repositoryContributorFilterOptions.value.length - 1;

  if (repositoryContributor.loading.value !== true && to === lastIndex) {
    repositoryContributor.next();
    ref.refresh();
  }
}
</script>

<style scoped></style>
