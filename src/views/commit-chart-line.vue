<script setup lang="ts">
import { useElementSize } from "@vueuse/core";
import { computed, onMounted, PropType, ref, toRefs, watch } from "vue";
import { scaleTime, scaleLinear, scaleOrdinal } from "d3-scale";
import { schemeAccent } from "d3-scale-chromatic";
import { rollup, max } from "d3-array";
import { select } from "d3-selection";
import { axisBottom, axisLeft } from "d3-axis";
import { RepositoryCommit } from "./use-git-commit.ts";
import { BaseType, InternMap, sum, timeDay } from "d3";
import { area, curveBasis } from "d3-shape";

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
    .attr("class", "xAxisG")
    .attr("transform", `translate(${0}, ${height.value - margin.value})`);
  select(chartCanvasRef.value!)
    .append("g")
    .attr("class", "yAxisG")
    .attr("transform", `translate(${margin?.value}, ${0})`);
});

const render = (commits: Array<[string, Array<RepositoryCommit>]>) => {
  const timeTicks = timeDay
    .every(1)
    ?.range(timeDay(new Date(start.value)), timeDay(new Date(end.value)));
  const rollupCommits = commits.map(([key, commits]) => {
    const map = rollup(
      commits,
      (d) => d.length,
      (datum) => timeDay(new Date(datum.author!.date!))
    );
    const sortedMap = new InternMap();

    timeTicks?.forEach((date) =>
      map.has(date) ? sortedMap.set(date, map.get(date)) : sortedMap.set(date, 0)
    );
    return [key, sortedMap] as const;
  });
  console.log(rollupCommits);

  const sumByDayCommits = rollup(
    Array.from(rollupCommits.values())
      .map(([, map]) => Array.from(map.entries()))
      .flat() as Array<[Date, number]>,
    (d) => sum(d.map(([, count]) => count)),
    ([date]) => timeDay(date)
  );

  const fillScale = scaleOrdinal(
    rollupCommits.map(([key]) => key),
    schemeAccent
  );
  const timeScale = scaleTime()
    .domain([new Date(start.value), new Date(end.value)])
    .range([margin?.value, boundWidth.value + margin?.value]);
  const commitCountScale = scaleLinear()
    .domain([0, max(sumByDayCommits.values())!])
    .range([boundHeight.value + margin?.value, margin?.value]);

  const xAxis = axisBottom(timeScale);
  const yAxis = axisLeft(commitCountScale);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-expect-error
  select(chartCanvasRef.value!).selectAll("g.xAxisG").call(xAxis);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-expect-error
  select(chartCanvasRef.value!).selectAll("g.yAxisG").call(yAxis);

  select(chartCanvasRef.value!)
    .selectAll("g.box")
    .data(rollupCommits)
    .join(
      (enter) =>
        enter
          .append("g")
          .attr("class", "box")
          .each(function (data, index) {
            updateChildren(this, ...data, index);
          }),
      (update) =>
        update.each(function (data, index) {
          updateChildren(this, ...data, index);
        }),
      (exit) => exit.remove()
    );

  function updateChildren(el: BaseType, key: string, data: InternMap<Date, number>, index: number) {
    const areaSelect = select(el);

    const commitArea = area<[Date, number]>()
      .x(([date]) => timeScale(date))
      .y0(([date, count]) => {
        console.log(
          rollupCommits
            .slice(0, index + 1)
            .reduce((pre, [, map]) => pre + (map.has(date) ? map.get(date)! : 0), 0) - count
        );
        return commitCountScale(
          rollupCommits
            .slice(0, index + 1)
            .reduce((pre, [, map]) => pre + (map.has(date) ? map.get(date)! : 0), 0) - count
        );
      })
      .y1(([date]) =>
        commitCountScale(
          rollupCommits
            .slice(0, index + 1)
            .reduce((pre, [, map]) => pre + (map.has(date) ? map.get(date)! : 0), 0)
        )
      )
      .curve(curveBasis);

    areaSelect
      .selectAll("path")
      .data([data])
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("d", commitArea(data))
            .attr("fill", fillScale(key))
            .style("stroke", "black")
            .style("stroke-width", 1),
        (update) =>
          update
            .attr("d", commitArea(data))
            .attr("fill", fillScale(key))
            .style("stroke", "black")
            .style("stroke-width", 1),
        (exit) => exit.remove()
      );
  }
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
