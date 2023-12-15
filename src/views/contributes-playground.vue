<script setup lang="ts">
import {
  initialOctokit,
  getGitReferences,
  getRepositories,
  getUser,
  getRepositoryContributors,
  getRepositoryCollaborators,
  getRepositoryCommits
} from "../http-interfaces";
import { computed, reactive, ref, toRefs, watch } from "vue";
import {
  mdiSourceRepository,
  mdiSourceBranch,
  mdiTagOutline,
  mdiAccountMultipleOutline
} from "@mdi/js";
import { notUAN, typeIsString } from "@siaikin/utils";
import * as dayjs from "dayjs";
import { watchDebounced } from "@vueuse/core";
import Chart from "./commit-chart.vue";

initialOctokit("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");

const formData = reactive({ tab: "branch" }) as Partial<{
  repository: Awaited<ReturnType<typeof getRepositories>>["data"][0];
  branches: Awaited<ReturnType<typeof getGitReferences>>["data"];
  tags: Awaited<ReturnType<typeof getGitReferences>>["data"];
  contributors: Awaited<ReturnType<typeof getRepositoryContributors>>["data"];
  collaborators: Awaited<ReturnType<typeof getRepositoryCollaborators>>["data"];
  dateRange: [string, string];
  tab: string;
}>;
const repositorySelected = computed(() => notUAN(formData.repository));

const user = (await getUser("siaikin")).data;
const repositories = (await getRepositories("siaikin")).data;

const gitBranch = reactive({
  branches: [] as Awaited<ReturnType<typeof getGitReferences>>["data"],
  loading: false
});
const gitTag = reactive({
  tags: [] as Awaited<ReturnType<typeof getGitReferences>>["data"],
  loading: false
});
const repositoryContributor = reactive({
  contributors: [] as Awaited<ReturnType<typeof getRepositoryContributors>>["data"],
  loading: false
});
const repositoryCollaborator = reactive({
  collaborators: [] as Awaited<ReturnType<typeof getRepositoryCollaborators>>["data"],
  loading: false
});

watchDebounced(
  () => ({ repository: formData.repository, tab: formData.tab }),
  async ({ repository, tab }) => {
    if (!typeIsString(repository?.name) || !typeIsString(tab)) return;

    switch (tab) {
      case "branch":
        gitBranch.loading = true;
        gitBranch.branches = (await getGitReferences(user.name!, repository.name, "heads/")).data;
        gitBranch.loading = false;
        break;
      case "tag":
        gitTag.loading = true;
        gitTag.tags = (await getGitReferences(user.name!, repository.name, "tags/")).data;
        gitTag.loading = false;
        break;
      case "contributor":
        repositoryContributor.loading = true;
        repositoryContributor.contributors = (
          await getRepositoryContributors(user.name!, repository.name)
        ).data;
        repositoryContributor.loading = false;
        break;
      case "collaborator":
        repositoryCollaborator.loading = true;
        repositoryCollaborator.collaborators = (
          await getRepositoryCollaborators(user.name!, repository.name)
        ).data;
        repositoryCollaborator.loading = false;
        break;
    }
  },
  { debounce: 480 }
);

const dataSource = reactive({
  commits: [] as Awaited<ReturnType<typeof getRepositoryCommits>>,
  tags: [] as Awaited<ReturnType<typeof getGitReferences>>["data"],
  loading: false
});

watch(
  () => toRefs(formData),
  async ({ repository, dateRange, tab }) => {
    if (
      !typeIsString(repository?.value?.name) ||
      !typeIsString(dateRange?.value?.[0]) ||
      !typeIsString(dateRange?.value?.[1])
    )
      return;

    try {
      dataSource.loading = true;

      switch (tab?.value) {
        case "branch": {
          // 传空字符串 "" 使用默认分支
          const branchRefs = formData.branches?.map((branch) => branch.ref) ?? [""];
          for (let i = 0; i < branchRefs.length; i++) {
            const ref = branchRefs[i];

            dataSource.commits = await getRepositoryCommits({
              owner: user.name!,
              repo: repository.value.name,
              sha: ref,
              since: dateRange.value[0],
              until: dateRange.value[1]
            });
          }
          break;
        }
        case "contributor": {
          const contributorLogins =
            formData.contributors?.map((contributor) => contributor.login) ?? [];
          for (let i = 0; i < contributorLogins.length; i++) {
            const login = contributorLogins[i];

            dataSource.commits = await getRepositoryCommits({
              owner: user.name!,
              repo: repository.value.name,
              author: login,
              since: dateRange.value[0],
              until: dateRange.value[1]
            });
          }
          break;
        }
        case "collaborator": {
          const collaboratorLogins =
            formData.collaborators?.map((collaborator) => collaborator.login) ?? [];
          for (let i = 0; i < collaboratorLogins.length; i++) {
            const login = collaboratorLogins[i];

            dataSource.commits = await getRepositoryCommits({
              owner: user.name!,
              repo: repository.value.name,
              author: login,
              since: dateRange.value[0],
              until: dateRange.value[1]
            });
          }
          break;
        }
      }
    } finally {
      dataSource.loading = false;
    }
  }
);

const today = dayjs();
const presetDateRange: Array<{ label: string; value: [string, string] }> = [
  {
    label: "This month",
    value: [
      today.startOf("month").format("YYYY-MM-DD"),
      today.endOf("month").format("YYYY-MM-DD")
    ] as const
  },
  {
    label: "This year",
    value: [
      today.startOf("year").format("YYYY-MM-DD"),
      today.endOf("year").format("YYYY-MM-DD")
    ] as const
  },
  {
    label: "Past month",
    value: [
      today.subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
      today.subtract(1, "month").endOf("month").format("YYYY-MM-DD")
    ] as const
  },
  {
    label: "Past year",
    value: [
      today.subtract(1, "year").startOf("year").format("YYYY-MM-DD"),
      today.subtract(1, "year").endOf("year").format("YYYY-MM-DD")
    ] as const
  },
  {
    label: "Past 30 days",
    value: [today.subtract(30, "day").format("YYYY-MM-DD"), today.format("YYYY-MM-DD")] as const
  },

  {
    label: "Past 60 days",
    value: [today.subtract(60, "day").format("YYYY-MM-DD"), today.format("YYYY-MM-DD")] as const
  },

  {
    label: "Past 90 days",
    value: [today.subtract(90, "day").format("YYYY-MM-DD"), today.format("YYYY-MM-DD")] as const
  },

  {
    label: "Past 365 days",
    value: [today.subtract(365, "day").format("YYYY-MM-DD"), today.format("YYYY-MM-DD")] as const
  }
] as const;
const dateRangeIndex = ref(0);
watch(dateRangeIndex, () => (formData.dateRange = presetDateRange[dateRangeIndex.value].value), {
  immediate: true
});
</script>

<template>
  <v-app-bar density="comfortable" color="primary">
    <v-app-bar-title> Contributions Infoviz </v-app-bar-title>

    <v-spacer />
  </v-app-bar>

  <v-main class="d-flex align-start justify-center">
    <v-sheet class="d-flex flex-column" height="100%" :width="480">
      <v-form class="flex-1-1" @submit.prevent>
        <v-combobox
          v-model:model-value="formData.repository"
          label="Repository"
          :items="repositories"
          item-title="full_name"
          item-value="full_name"
          density="comfortable"
          :auto-select-first="true"
        >
          <template #prepend-inner>
            <v-icon :icon="mdiSourceRepository" />
          </template>
        </v-combobox>

        <v-chip-group
          v-model:model-value="dateRangeIndex"
          selected-class="text-primary"
          :column="true"
          :filter="true"
          :disabled="!notUAN(formData.repository)"
        >
          <v-chip
            v-for="item in presetDateRange"
            :key="item.label"
            density="comfortable"
            size="small"
          >
            {{ item.label }}
          </v-chip>
        </v-chip-group>

        <v-divider />

        <v-tabs
          v-model:model-value="formData.tab"
          density="comfortable"
          :grow="true"
          :disabled="!repositorySelected"
        >
          <v-tab key="branch" value="branch">Branch</v-tab>
          <v-tab key="tag" value="tag">Tag</v-tab>
          <v-tab key="contributor" value="contributor">Contributor</v-tab>
          <v-tab key="collaborator" value="collaborator">Collaborator</v-tab>
        </v-tabs>

        <v-window v-if="repositorySelected" v-model:model-value="formData.tab" :mandatory="false">
          <v-window-item value="branch">
            <v-combobox
              v-model:model-value="formData.branches"
              label="Branches"
              :clearable="true"
              :items="gitBranch.branches"
              :loading="gitBranch.loading"
              item-title="ref"
              item-value="ref"
              density="comfortable"
              :chips="true"
              :multiple="true"
              :auto-select-first="true"
              :messages="gitBranch.branches.length <= 0 ? ['No branches'] : []"
            >
              <template #prepend-inner>
                <v-icon :icon="mdiSourceBranch" />
              </template>
            </v-combobox>
          </v-window-item>

          <v-window-item value="tag">
            <v-combobox
              v-model:model-value="formData.tags"
              label="Tags"
              :clearable="true"
              :items="gitTag.tags"
              :loading="gitTag.loading"
              item-title="ref"
              item-value="ref"
              density="comfortable"
              :chips="true"
              :multiple="true"
              :auto-select-first="true"
              :messages="gitTag.tags.length <= 0 ? ['No tags'] : []"
            >
              <template #prepend-inner>
                <v-icon :icon="mdiTagOutline" />
              </template>
            </v-combobox>
          </v-window-item>

          <v-window-item value="contributor">
            <v-combobox
              v-model:model-value="formData.contributors"
              label="Contributors"
              :items="repositoryContributor.contributors"
              :loading="repositoryContributor.loading"
              :clearable="true"
              item-title="login"
              item-value="login"
              density="comfortable"
              :chips="true"
              :multiple="true"
              :auto-select-first="true"
              :messages="repositoryContributor.contributors.length <= 0 ? ['No contributors'] : []"
            >
              <template #prepend-inner>
                <v-icon :icon="mdiAccountMultipleOutline" />
              </template>
              <template #item="{ item, props }">
                <v-list-item v-bind="props">
                  <template #prepend="{ isActive }">
                    <v-list-item-action :start="true">
                      <v-checkbox-btn :model-value="isActive" />
                    </v-list-item-action>
                  </template>
                  <template #append>
                    <v-avatar>
                      <v-img :src="item.raw.avatar_url" :alt="item.raw.login" />
                    </v-avatar>
                  </template>
                </v-list-item>
              </template>
              <template #chip="{ item, props }">
                <v-chip v-bind="props">
                  {{ item.raw.login }}
                  <template #prepend>
                    <v-avatar size="small" :start="true">
                      <v-img :src="item.raw.avatar_url" :alt="item.raw.login" />
                    </v-avatar>
                  </template>
                </v-chip>
              </template>
            </v-combobox>
          </v-window-item>

          <v-window-item value="collaborator">
            <v-combobox
              v-model:model-value="formData.collaborators"
              label="Collaborators"
              :items="repositoryCollaborator.collaborators"
              :loading="repositoryCollaborator.loading"
              :clearable="true"
              item-title="login"
              item-value="login"
              density="comfortable"
              :chips="true"
              :multiple="true"
              :auto-select-first="true"
              :messages="
                repositoryCollaborator.collaborators.length <= 0 ? ['No collaborators'] : []
              "
            >
              <template #prepend-inner>
                <v-icon :icon="mdiAccountMultipleOutline" />
              </template>
              <template #item="{ item, props }">
                <v-list-item v-bind="props">
                  <template #prepend="{ isActive }">
                    <v-list-item-action :start="true">
                      <v-checkbox-btn :model-value="isActive" />
                    </v-list-item-action>
                  </template>
                  <template #append>
                    <v-avatar>
                      <v-img :src="item.raw.avatar_url" :alt="item.raw.login" />
                    </v-avatar>
                  </template>
                </v-list-item>
              </template>
              <template #chip="{ item, props }">
                <v-chip v-bind="props">
                  {{ item.raw.login }}
                  <template #prepend>
                    <v-avatar size="small" :start="true">
                      <v-img :src="item.raw.avatar_url" :alt="item.raw.login" />
                    </v-avatar>
                  </template>
                </v-chip>
              </template>
            </v-combobox>
          </v-window-item>
        </v-window>
      </v-form>

      <v-sheet height="24" class="v-system-bar flex-0-0">
        <v-avatar density="compact" size="x-small" :text="user.name!">
          <v-img :src="user.avatar_url" :alt="user.name!" />
        </v-avatar>
        <span class="ms-1">{{ user.name }}</span>

        <v-spacer />

        <span class="ms-2">
          commits:
          <template v-if="dataSource.loading">
            <v-progress-circular
              indeterminate
              color="primary"
              size="x-small"
              width="2"
            ></v-progress-circular>
          </template>
          <template v-else>
            {{ dataSource.commits.length }}
          </template>
        </span>
      </v-sheet>
    </v-sheet>
    <v-sheet height="100%" class="flex-1-1" :border="true">
      <template v-if="repositorySelected">
        <Chart
          :type="formData.tab"
          :data-source="dataSource.commits"
          :start="formData.dateRange[0]"
          :end="formData.dateRange[1]"
        />
      </template>
      <template v-else>
        <v-sheet class="d-flex flex-column align-center justify-center" height="100%">
          <v-icon size="64" color="grey lighten-1" :icon="mdiSourceRepository"></v-icon>
          <p class="text-h5">Select a repository</p>
        </v-sheet>
      </template>
    </v-sheet>
  </v-main>
</template>

<style scoped></style>
