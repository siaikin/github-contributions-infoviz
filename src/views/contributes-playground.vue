<script setup lang="ts">
import {
  initialOctokit,
  getGitReferences,
  getRepositoryContributors,
  getRepositoryCollaborators
} from "../http-interfaces";
import { computed, reactive, ref, watch } from "vue";
import {
  mdiSourceRepository,
  mdiSourceBranch,
  mdiTagOutline,
  mdiAccountMultipleOutline,
  mdiKeyboardReturn
} from "@mdi/js";
import { notUAN, typeIsString } from "@siaikin/utils";
import * as dayjs from "dayjs";
import { watchDebounced } from "@vueuse/core";
import CommitChart from "./commit-chart.vue";
import { useGitCommit } from "./use-git-commit.ts";
import { timeFormatDefaultLocale } from "d3-time-format";
import { Repository, useRepositories } from "./use-repositories.ts";

timeFormatDefaultLocale({
  dateTime: "%x %A %X",
  date: "%Y年%-m月%-d日",
  time: "%H:%M:%S",
  periods: ["上午", "下午"],
  days: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
  shortDays: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  months: [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月"
  ],
  shortMonths: [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月"
  ]
});

initialOctokit("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");

const formData = reactive({ tab: "branch" }) as Partial<{
  repository: Repository;
  branches: Awaited<ReturnType<typeof getGitReferences>>["data"];
  tags: Awaited<ReturnType<typeof getGitReferences>>["data"];
  contributors: Awaited<ReturnType<typeof getRepositoryContributors>>["data"];
  collaborators: Awaited<ReturnType<typeof getRepositoryCollaborators>>["data"];
  dateRange: [string, string];
  tab: "branch" | "contributor" | "collaborator";
}>;
const repositorySelected = computed(() => notUAN(formData.repository));

const repositories = useRepositories();
const repositorySearchValue = ref("");

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
        gitBranch.branches = (
          await getGitReferences(repository.owner.login!, repository.name, "heads/")
        ).data;
        gitBranch.loading = false;
        break;
      // case "tag":
      //   gitTag.loading = true;
      //   gitTag.tags = (await getGitReferences(user.name!, repository.name, "tags/")).data;
      //   gitTag.loading = false;
      //   break;
      case "contributor":
        repositoryContributor.loading = true;
        repositoryContributor.contributors = (
          await getRepositoryContributors(repository.owner.login!, repository.name)
        ).data;
        repositoryContributor.loading = false;
        break;
      case "collaborator":
        repositoryCollaborator.loading = true;
        repositoryCollaborator.collaborators = (
          await getRepositoryCollaborators(repository.owner.login!, repository.name)
        ).data;
        repositoryCollaborator.loading = false;
        break;
    }
  },
  { debounce: 480 }
);

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
        <v-autocomplete
          v-model:model-value="formData.repository"
          v-model:search="repositorySearchValue"
          label="Search repository"
          :items="repositories.data.value"
          :loading="repositories.loading.value"
          item-title="full_name"
          item-value="full_name"
          density="comfortable"
          :auto-select-first="true"
          :autofocus="true"
          :return-object="true"
          :chips="true"
          @keydown.enter="repositorySearchValue && repositories.fetch(repositorySearchValue)"
        >
          <template #prepend-inner>
            <v-icon :icon="mdiSourceRepository" />
          </template>
          <template #clear>
            <v-icon :icon="mdiKeyboardReturn" />
          </template>
          <template #item="{ item, props }">
            <v-list-item v-bind="props">
              <template #append>
                <v-avatar>
                  <v-img :src="item.raw.owner.avatar_url" :alt="item.raw.owner.login" />
                </v-avatar>
              </template>
            </v-list-item>
          </template>
          <template #chip="{ item, props }">
            <v-chip v-bind="props">
              {{ item.raw.owner.login }}
              <template #prepend>
                <v-avatar size="small" :start="true">
                  <v-img :src="item.raw.owner.avatar_url" :alt="item.raw.owner.login" />
                </v-avatar>
              </template>
            </v-chip>
          </template>
        </v-autocomplete>

        <v-chip-group
          v-model:model-value="dateRangeIndex"
          selected-class="text-primary"
          :column="true"
          :filter="true"
          :disabled="!notUAN(formData.repository)"
        >
          <v-chip v-for="item in presetDateRange" :key="item.label" size="small">
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
              placeholder="default: repository's default branch"
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

        <v-btn
          :disabled="!repositorySelected"
          type="submit"
          variant="tonal"
          :rounded="0"
          :block="true"
          class="mt-2"
          @click="commits.fetch()"
          >OK</v-btn
        >
      </v-form>

      <v-sheet height="24" class="v-system-bar flex-0-0">
        <v-spacer />

        <span class="ms-2 text-truncate">
          <template v-if="commits.loading.value">
            {{ commits.loadingText.value }}
          </template>
          <template v-else> {{ commits.commitCount.value }} commits </template>
        </span>
      </v-sheet>
    </v-sheet>
    <v-sheet height="100%" class="flex-1-1" :border="true" position="relative">
      <template v-if="repositorySelected">
        <CommitChart
          :type="formData.tab!"
          :data-source="commits.data.value"
          :start="formData?.dateRange![0]"
          :end="formData?.dateRange![1]!"
        />
      </template>
      <template v-else>
        <v-sheet class="d-flex flex-column align-center justify-center" height="100%">
          <v-icon size="64" color="grey lighten-1" :icon="mdiSourceRepository"></v-icon>
          <p class="text-h5">Select a repository</p>
        </v-sheet>
      </template>
      <v-progress-linear
        :absolute="true"
        :indeterminate="commits.loading.value"
        :active="commits.loading.value"
      />
    </v-sheet>
  </v-main>
</template>

<style scoped></style>
