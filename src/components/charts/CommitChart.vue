<template>
  <div class="flex flex-col w-full h-full">
    <div
      ref="chartContainerRef"
      class="flex-auto relative flex justify-center items-center"
    >
      <svg
        ref="chartCanvasRef"
        :class="{
          'w-full': containerAspectRate <= chartAspectRatio,
          'h-full': chartAspectRatio < containerAspectRate,
        }"
        :viewBox="viewBox"
      ></svg>
    </div>
    <div class="flex-none flex flex-col p-1">
      <div class="flex flex-nowrap items-center gap-1">
        <q-slider
          class="flex-auto pl-2 pr-2"
          v-model="currentTime"
          :min="0"
          :max="timeline.length - 1"
        />
        <span>{{ playbackProgress }}</span>
      </div>
      <div class="flex">
        <div class="flex-auto"></div>
        <q-btn-group outline>
          <q-btn
            round
            flat
            :icon="playing ? 'mdi-pause' : 'mdi-play'"
            @click="handlePauseOrResume"
          />
          <q-btn round flat icon="mdi-reload" @click="handleReset" />
          <q-btn-dropdown>
            <template #label> x{{ speed }} </template>
            <q-list>
              <template v-for="item in availableSpeeds" :key="item">
                <q-item clickable v-close-popup @click="speed = item">
                  <q-item-section>
                    <q-item-label>x{{ item }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-list>
          </q-btn-dropdown>
        </q-btn-group>
        <div class="flex-auto text-right">
          <q-btn-group outline>
            <q-btn-dropdown>
              <template #label>
                {{ resolutionRate[0] }}x{{ resolutionRate[1] }}
              </template>
              <q-list>
                <template v-for="item in availableResolutionRates" :key="item">
                  <q-item
                    clickable
                    v-close-popup
                    @click="resolutionRate = item"
                  >
                    <q-item-section>
                      <q-item-label> {{ item[0] }}x{{ item[1] }} </q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-list>
            </q-btn-dropdown>
            <q-btn
              round
              flat
              :icon="
                orientationIsLandscape
                  ? 'mdi-phone-rotate-landscape'
                  : 'mdi-phone-rotate-portrait'
              "
              @click="orientationIsLandscape = !orientationIsLandscape"
            />
          </q-btn-group>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useElementSize } from '@vueuse/core';
import {
  computed,
  onMounted,
  PropType,
  ref,
  shallowReactive,
  toRefs,
  watch,
} from 'vue';
import { useCommitStore } from 'stores/commit-store';
import { storeToRefs } from 'pinia';
import { isNil } from 'lodash-es';
import { Margin, Renderer } from 'components/charts/renderer';
import formatDuration from 'format-duration';

const props = defineProps({
  margin: {
    type: Object as PropType<Margin>,
    default: () => ({
      marginTop: 20,
      marginRight: 60,
      marginBottom: 20,
      marginLeft: 20,
    }),
  },
});
const { margin } = toRefs(props);

const { searchParams, commits } = storeToRefs(useCommitStore());
const flattedCommits = computed(() => Object.entries(commits.value));

const chartContainerRef = ref<HTMLDivElement>();
const { width, height } = useElementSize(chartContainerRef);
const containerAspectRate = computed(() => width.value / height.value);

const chartCanvasRef = ref<SVGElement>();

const renderer = ref<Renderer>();
const currentTime = computed({
  get: () => renderer.value?.currentTime ?? 0,
  set: (value) => {
    const _renderer = renderer.value;
    if (isNil(_renderer)) return;

    _renderer.currentTime = value;
  },
});
const timeline = computed(() => renderer.value?.timeline ?? []);
const animationDuration = computed(
  () => renderer.value?.animationDuration ?? 0
);

const playing = computed(() => renderer.value?.playing ?? false);
const playbackProgress = computed(
  () =>
    `${formatDuration(
      currentTime.value * animationDuration.value
    )}/${formatDuration(timeline.value.length * animationDuration.value)}`
);

const speed = ref(1);
const availableSpeeds = ref([0.5, 1, 2, 4] as const);

const availableResolutionRates = ref([
  [1280, 720],
  [1920, 1080],
] as const);
const resolutionRate = ref(availableResolutionRates.value[0]);
const orientationIsLandscape = ref(true);
const viewBox = computed(
  () =>
    `0 0 ${resolutionRate.value[orientationIsLandscape.value ? 0 : 1]} ${
      resolutionRate.value[orientationIsLandscape.value ? 1 : 0]
    }`
);
const chartAspectRatio = computed(
  () =>
    resolutionRate.value[orientationIsLandscape.value ? 0 : 1] /
    resolutionRate.value[orientationIsLandscape.value ? 1 : 0]
);

onMounted(() => {
  if (isNil(chartCanvasRef.value)) return;

  renderer.value = shallowReactive(
    new Renderer(chartCanvasRef.value, margin.value)
  );

  watch(speed, (rate) => renderer.value?.playbackRate(rate), {
    immediate: true,
  });
  watch(
    flattedCommits,
    () =>
      renderer.value?.data(
        flattedCommits.value,
        searchParams.value.contributors,
        new Date(searchParams.value.dateRange?.[0] ?? ''),
        new Date(searchParams.value.dateRange?.[1] ?? '')
      ),
    { immediate: true }
  );
});

function handlePauseOrResume() {
  const _renderer = renderer.value;
  if (isNil(_renderer)) return;

  if (_renderer.playing) {
    _renderer.pause();
  } else {
    _renderer.resume();
  }
}

function handleReset() {
  const _renderer = renderer.value;
  if (isNil(_renderer)) return;

  _renderer.reset();
}
</script>

<style lang="scss">
path.domain {
  display: none;
}

.tick {
  line {
    stroke: lightgray;
  }
  text {
    fill: gray;
  }
}
</style>
