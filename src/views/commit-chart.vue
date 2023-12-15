<script setup lang="ts">
import { useElementSize } from "@vueuse/core";
import { computed, onMounted, PropType, ref, toRefs, watch } from "vue";
import { scaleTime, scaleLinear, scaleOrdinal } from "d3-scale";
import { schemeAccent } from "d3-scale-chromatic";
import { rollup, max } from "d3-array";
import { select } from "d3-selection";
import { axisBottom, axisLeft } from "d3-axis";
import { RepositoryCommit } from "./use-git-commit.ts";
import { InternMap, sum, timeDay } from "d3";
import { area, Series, SeriesPoint, stack } from "d3-shape";

const props = defineProps({
  type: {
    type: String as PropType<"branch" | "contributor" | "collaborator">,
    required: true
  },
  start: {
    type: String,
    required: true
  },
  end: {
    type: String,
    required: true
  },
  dataSource: {
    type: Object as PropType<Record<string, Array<RepositoryCommit>>>,
    default: () => ({})
  },
  margin: {
    type: Number,
    default: 30
  }
});

const { dataSource, margin, start, end } = toRefs(props);

const chartWrapperRef = ref<HTMLDivElement>();
const chartCanvasRef = ref<HTMLDivElement>();

const { width, height } = useElementSize(chartWrapperRef);
const boundWidth = computed(() => width.value - margin.value * 2);
const boundHeight = computed(() => height.value - margin.value * 2);

const flattedCommits = computed(() => Object.entries(dataSource.value));

onMounted(() => {
  select(chartCanvasRef.value!)
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(${0}, ${height.value - margin.value})`);
  select(chartCanvasRef.value!)
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin?.value}, ${0})`);
});

const render = (commitGroups: Array<[string, Array<RepositoryCommit>]>) => {
  const timeTicks = timeDay
    .every(1)
    ?.range(timeDay(new Date(start.value)), timeDay(new Date(end.value)));
  const rollupCommitGroups = commitGroups.map(([key, commits]) => {
    const originMap = rollup(
      commits,
      (d) => d.length,
      (datum) => timeDay(new Date(datum.author!.date!))
    );
    const sortedMap = new InternMap<Date, number>();

    // 保证每个时间点都有值
    for (let i = 0; i < timeTicks.length; i++) {
      const date = timeTicks[i];
      originMap.has(date) ? sortedMap.set(date, originMap.get(date)!) : sortedMap.set(date, 0);
    }
    return [key, sortedMap] as const;
  });

  // 按照时间分组的 commit 数量
  const commitGroupByDay = rollup(
    rollupCommitGroups.map(([, map]) => Array.from(map.entries())).flat() as Array<[Date, number]>,
    (values) => sum(values.map(([, count]) => count)),
    ([date]) => timeDay(date)
  );

  const groupKeys = rollupCommitGroups.map(([key]) => key);

  const fillScale = scaleOrdinal(groupKeys, schemeAccent);
  const timeScale = scaleTime()
    .domain([timeDay(new Date(start.value)), timeDay(new Date(end.value))])
    .range([margin?.value, boundWidth.value + margin?.value]);
  const commitCountScale = scaleLinear()
    .domain([0, max(commitGroupByDay.values())!])
    .range([boundHeight.value + margin?.value, margin?.value]);

  const stackLayout = stack<Date, number>()
    .keys(Array.from({ length: groupKeys.length }, (_, index) => index))
    .value((D, key) => rollupCommitGroups[key][1].get(D)!);

  const xAxis = axisBottom(timeScale);
  const yAxis = axisLeft(commitCountScale);
  select(chartCanvasRef.value!).selectAll("g.x-axis").call(xAxis);
  select(chartCanvasRef.value!).selectAll("g.y-axis").call(yAxis);

  const stackArea = area<SeriesPoint<number>>()
    .x((_, index) => timeScale(timeTicks[index]))
    .y0((datum) => commitCountScale(datum[0]))
    .y1((datum) => commitCountScale(datum[1]));

  select(chartCanvasRef.value!)
    .selectAll("path.stacked")
    .data(stackLayout(timeTicks) as unknown as Array<Series<number, number>>)
    .join(
      (enter) =>
        enter
          .append("path")
          .classed("stacked", true)
          .attr("fill", (_, index) => fillScale(groupKeys[index]))
          .attr("d", (d) => stackArea(d)),
      (update) => update.attr("d", (d) => stackArea(d)),
      (exit) => exit.remove()
    );
};
watch(flattedCommits, render);
</script>

<template>
  <div ref="chartWrapperRef" class="chart-wrapper">
    <svg ref="chartCanvasRef" :width="width" :height="height"></svg>
  </div>
</template>

<style scoped>
.chart-wrapper {
  width: 100%;
  height: 100%;

  svg {
    vertical-align: middle;
  }
}
</style>
