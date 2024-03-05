<template>
  <div class="q-pa-md" style="max-width: 400px">
    <q-form class="q-gutter-md">
      <q-select
        filled
        v-model="formData.repository"
        clearable
        use-input
        input-debounce="500"
        label="Focus after filtering"
        :options="repositories.data.value"
        :loading="repositories.loading.value"
        @filter="
          async (inputValue, doneFn, abort) => {
            repositories.searchValue.value = inputValue;
            repositories.fetch();
            await until(repositories.loading).toBe(false);
            doneFn(() => ({}));
          }
        "
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
            color="white"
            text-color="secondary"
            class="q-ma-none"
          >
            <q-avatar color="secondary" text-color="white">
              <img :src="opt.owner.avatar_url" :alt="opt.owner.login" />
            </q-avatar>
          </q-chip>
        </template>
      </q-select>

      <div>
        <q-btn label="Submit" type="submit" color="primary" />
      </div>
    </q-form>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { computed, reactive, ref, watch } from 'vue';
import {
  getGitReferences,
  getRepositoryCollaborators,
  getRepositoryContributors,
} from '../../http-interfaces';
import { presetDateRange } from './models';
import { useGitCommit } from './use-git-commit';
import { until, watchDebounced } from '@vueuse/core';
import { isNil, isString } from 'lodash-es';
import { Repository, useRepositories } from './use-repositories';

const $q = useQuasar();

const formData = reactive({ tab: 'branch' }) as Partial<{
  repository: Repository;
  branches: Awaited<ReturnType<typeof getGitReferences>>['data'];
  tags: Awaited<ReturnType<typeof getGitReferences>>['data'];
  contributors: Awaited<ReturnType<typeof getRepositoryContributors>>['data'];
  collaborators: Awaited<ReturnType<typeof getRepositoryCollaborators>>['data'];
  dateRange: [string, string];
  tab: 'branch' | 'contributor' | 'collaborator';
}>;

const repositorySelected = computed(() => !isNil(formData.repository));

const repositories = useRepositories();
console.log(repositories);

const gitBranch = reactive({
  branches: [] as Awaited<ReturnType<typeof getGitReferences>>['data'],
  loading: false,
});
const gitTag = reactive({
  tags: [] as Awaited<ReturnType<typeof getGitReferences>>['data'],
  loading: false,
});
const repositoryContributor = reactive({
  contributors: [] as Awaited<
    ReturnType<typeof getRepositoryContributors>
  >['data'],
  loading: false,
});
const repositoryCollaborator = reactive({
  collaborators: [] as Awaited<
    ReturnType<typeof getRepositoryCollaborators>
  >['data'],
  loading: false,
});

// watchDebounced(
//   () => ({ repository: formData.repository, tab: formData.tab }),
//   async ({ repository, tab }) => {
//     if (!isString(repository?.name) || !isString(tab)) return;
//
//     switch (tab) {
//       case 'branch':
//         gitBranch.loading = true;
//         gitBranch.branches = (
//           await getGitReferences(
//             repository.owner.login!,
//             repository.name,
//             'heads/'
//           )
//         ).data;
//         gitBranch.loading = false;
//         break;
//       // case "tag":
//       //   gitTag.loading = true;
//       //   gitTag.tags = (await getGitReferences(user.name!, repository.name, "tags/")).data;
//       //   gitTag.loading = false;
//       //   break;
//       case 'contributor':
//         repositoryContributor.loading = true;
//         repositoryContributor.contributors = (
//           await getRepositoryContributors(
//             repository.owner.login!,
//             repository.name
//           )
//         ).data;
//         repositoryContributor.loading = false;
//         break;
//       case 'collaborator':
//         repositoryCollaborator.loading = true;
//         repositoryCollaborator.collaborators = (
//           await getRepositoryCollaborators(
//             repository.owner.login!,
//             repository.name
//           )
//         ).data;
//         repositoryCollaborator.loading = false;
//         break;
//     }
//   },
//   { debounce: 480 }
// );

const commits = useGitCommit(
  computed(() => formData.repository?.owner.login),
  computed(() => formData.repository?.name),
  computed(() => formData.branches?.map((item) => item.ref) ?? []),
  computed(() => formData.tags?.map((item) => item.ref) ?? []),
  computed(() => formData.contributors?.map((item) => item.login!) ?? []),
  computed(() => formData.collaborators?.map((item) => item.login) ?? []),
  computed(() => formData.dateRange),
  computed(() => formData.tab)
);

const dateRangeIndex = ref(0);
watch(
  dateRangeIndex,
  () => (formData.dateRange = [...presetDateRange[dateRangeIndex.value].value]),
  { immediate: true }
);
</script>

<style scoped></style>
