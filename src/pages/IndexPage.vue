<template>
  <q-page :style-fn="handlePageHeight">
    <q-splitter
      v-if="authorized"
      :horizontal="$q.screen.lt.sm"
      class="h-full"
      v-model="splitterModel"
    >
      <template #before>
        <SearchPanel />
      </template>
      <template #separator>
        <q-btn
          class="cursor-grab"
          round
          color="primary"
          size="sm"
          icon="mdi-drag-vertical"
        >
        </q-btn>
      </template>
      <template #after>
        <div class="flex-auto overflow-hidden relative h-full">
          <template v-if="repositorySelected">
            <CommitChart />
          </template>
          <template v-else>
            <div class="flex flex-col justify-center items-center h-full">
              <q-icon name="mdi-source-repository" size="lg" color="gray" />
              <p class="text-xl">Select a repository</p>
            </div>
          </template>
        </div>
      </template>
    </q-splitter>
  </q-page>
</template>

<script setup lang="ts">
import { timeFormatDefaultLocale } from 'd3-time-format';
import SearchPanel from 'components/search-panel/SearchPanel.vue';
import { useCommitStore } from 'stores/commit-store';
import CommitChart from 'components/charts/CommitChart.vue';
import { computed, watch, ref } from 'vue';
import { isNil } from 'lodash-es';
import { useQuasar } from 'quasar';
import LoginDialog from 'components/LoginDialog.vue';
import { useOAuthStore } from 'stores/oauth-store';
import { initialOctokit } from 'src/http-interfaces';
import { storeToRefs } from 'pinia';

const $q = useQuasar();

const oauthStore = useOAuthStore();
const { token } = storeToRefs(oauthStore);

const commitStore = useCommitStore();
const repositorySelected = computed(
  () => !isNil(commitStore.searchParams.repository)
);

timeFormatDefaultLocale({
  dateTime: '%x %A %X',
  date: '%Y年%-m月%-d日',
  time: '%H:%M:%S',
  periods: ['上午', '下午'],
  days: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  shortDays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  months: [
    '一月',
    '二月',
    '三月',
    '四月',
    '五月',
    '六月',
    '七月',
    '八月',
    '九月',
    '十月',
    '十一月',
    '十二月',
  ],
  shortMonths: [
    '一月',
    '二月',
    '三月',
    '四月',
    '五月',
    '六月',
    '七月',
    '八月',
    '九月',
    '十月',
    '十一月',
    '十二月',
  ],
});

function handlePageHeight(offset: number, height: number) {
  return {
    height: `${height - offset}px`,
  };
}

const authorized = ref(false);
watch(
  token,
  (value) => {
    if (!value) return;
    initialOctokit(value);
    authorized.value = true;
  },
  { immediate: true }
);

if (!authorized.value) {
  $q.dialog({
    component: LoginDialog,
  });
}

const splitterModel = ref(20);
</script>
