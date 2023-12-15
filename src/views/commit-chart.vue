<script setup lang="ts">
import { useElementSize } from "@vueuse/core";
import { computed, onMounted, PropType, ref, toRefs, watchEffect } from "vue";
import { getRepositoryCommits } from "../http-interfaces";
import { scaleTime, scaleLinear } from "d3-scale";
import { sum, rollup, max, min } from "d3-array";
import { select } from "d3-selection";
import { axisBottom, axisLeft } from "d3-axis";
import { timeMonth, timeWeek } from "d3-time";
import { mean } from "d3";

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
    type: Array as PropType<Awaited<ReturnType<typeof getRepositoryCommits>>>,
    default: () => []
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

const commits = computed(() => dataSource.value?.map((item) => item.commit) ?? []);

onMounted(() => {
  select(chartCanvasRef.value)
    .append("g")
    .attr("class", "xAxisG")
    .attr("transform", `translate(${0}, ${height.value - margin.value})`);
  select(chartCanvasRef.value)
    .append("g")
    .attr("class", "yAxisG")
    .attr("transform", `translate(${margin?.value}, ${0})`);
});

watchEffect(() => {
  if (commits.value.length === 0) return;

  const commitNestedMap = rollup(
    commits.value,
    (d) => d.length,
    (d) => timeMonth(new Date(d.author.date)),
    (d) => timeWeek(new Date(d.author.date))
  );

  const timeScale = scaleTime()
    .domain([new Date(start.value), new Date(end.value)])
    .range([margin?.value, boundWidth.value + margin?.value]);
  const commitCountScale = scaleLinear()
    .domain([0, max(commitNestedMap.values(), (d) => sum(d.values()))])
    .range([boundHeight.value + margin?.value, margin?.value]);

  select(chartCanvasRef.value).selectAll("g.xAxisG").call(axisBottom().scale(timeScale));
  select(chartCanvasRef.value).selectAll("g.yAxisG").call(axisLeft().scale(commitCountScale));
  select(chartCanvasRef.value)
    .selectAll("g.box")
    .data(commitNestedMap.entries())
    .enter()
    .append("g")
    .attr("class", "box")
    .attr(
      "transform",
      ([key, value]) => `translate(${timeScale(key)}, ${commitCountScale(mean(value.values()))})`
    )
    .attr("asd", ([, value]) => Array.from(value.values()))
    .each(function ([, value]) {
      const boxWidth = 20;
      const boxHeight =
        commitCountScale(min(value.values())) - commitCountScale(max(value.values()));
      const box = select(this);
      box
        .append("rect")
        .attr("width", boxWidth)
        .attr("height", boxHeight)
        .attr("x", -10)
        .attr("y", commitCountScale(max(value.values())) - commitCountScale(mean(value.values())));
      // box.append("circle").attr("r", 5).attr("cx", 0).attr("cy", 0);
    });
});
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
