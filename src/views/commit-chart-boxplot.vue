<script setup lang="ts">
import { useElementSize } from "@vueuse/core";
import { computed, onMounted, PropType, ref, toRefs, watchEffect } from "vue";
import { scaleTime, scaleLinear } from "d3-scale";
import { mean, rollup, max, quantile } from "d3-array";
import { select } from "d3-selection";
import { axisBottom, axisLeft } from "d3-axis";
import { timeMonth, timeWeek } from "d3-time";
import { RepositoryCommit } from "./use-git-commit.ts";

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

const commits = computed(() => dataSource.value[Object.keys(dataSource.value)[0]] ?? []);

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

watchEffect(() => {
  if (commits.value.length === 0) return;

  const commitNestedMap = rollup(
    commits.value,
    (d) => d.length,
    (d) => timeMonth(new Date(d.author!.date!)),
    (d) => timeWeek(new Date(d.author!.date!))
  );

  const timeScale = scaleTime()
    .domain([new Date(start.value), new Date(end.value)])
    .range([margin?.value, boundWidth.value + margin?.value]);
  const commitCountScale = scaleLinear()
    .domain([0, max(commitNestedMap.values(), (d) => max(d.values()))!])
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
    .data(commitNestedMap.entries())
    .join(
      (enter) =>
        enter
          .append("g")
          .attr("class", "box")
          .attr(
            "transform",
            ([key, value]) =>
              `translate(${timeScale(key)}, ${commitCountScale(mean(value.values())!)})`
          )
          .attr("asd", ([, value]) => Array.from(value.values()))
          .each(updateChildren),
      (update) =>
        update
          .attr(
            "transform",
            ([key, value]) =>
              `translate(${timeScale(key)}, ${commitCountScale(mean(value.values())!)})`
          )
          .attr("asd", ([, value]) => Array.from(value.values()))
          .each(updateChildren),
      (exit) => exit.remove()
    );

  function updateChildren([key, value]) {
    const boxplotSelect = select(this);

    const q0 = quantile(value.values(), 0)!;
    const q1 = quantile(value.values(), 0.25)!;
    const q2 = mean(value.values())!;
    const q3 = quantile(value.values(), 0.75)!;
    const q4 = quantile(value.values(), 1)!;

    boxplotSelect
      .selectAll("line.line")
      .data([key])
      .join(
        (enter) =>
          enter
            .append("line")
            .attr("class", "line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", commitCountScale(q4) - commitCountScale(q2))
            .attr("y2", commitCountScale(q0) - commitCountScale(q2))
            .style("stroke", "black")
            .style("stroke-width", "4px"),
        (update) =>
          update
            .attr("y1", commitCountScale(q4) - commitCountScale(q2))
            .attr("y2", commitCountScale(q0) - commitCountScale(q2))
      );
    boxplotSelect
      .selectAll("line.max")
      .data([key])
      .join(
        (enter) =>
          enter
            .append("line")
            .attr("class", "max")
            .attr("x1", -10)
            .attr("x2", 10)
            .attr("y1", commitCountScale(q4) - commitCountScale(q2))
            .attr("y2", commitCountScale(q4) - commitCountScale(q2))
            .style("stroke", "black")
            .style("stroke-width", "4px"),
        (update) =>
          update
            .attr("y1", commitCountScale(q4) - commitCountScale(q2))
            .attr("y2", commitCountScale(q4) - commitCountScale(q2))
      );
    boxplotSelect
      .selectAll("line.min")
      .data([key])
      .join(
        (enter) =>
          enter
            .append("line")
            .attr("class", "min")
            .attr("x1", -10)
            .attr("x2", 10)
            .attr("y1", commitCountScale(q0) - commitCountScale(q2))
            .attr("y2", commitCountScale(q0) - commitCountScale(q2))
            .style("stroke", "black")
            .style("stroke-width", "4px"),
        (update) =>
          update
            .attr("y1", commitCountScale(q0) - commitCountScale(q2))
            .attr("y2", commitCountScale(q0) - commitCountScale(q2))
      );
    boxplotSelect
      .selectAll("rect.range")
      .data([key])
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "range")
            .attr("width", 20)
            .attr("x", -10)
            .attr("y", commitCountScale(q3) - commitCountScale(q2))
            .attr("height", commitCountScale(q1) - commitCountScale(q3))
            .style("fill", "white")
            .style("stroke", "black")
            .style("stroke-width", "2px"),
        (update) =>
          update
            .attr("y", commitCountScale(q3) - commitCountScale(q2))
            .attr("height", commitCountScale(q1) - commitCountScale(q3))
      );
    boxplotSelect
      .selectAll("line.mean")
      .data([key])
      .join((enter) =>
        enter
          .append("line")
          .attr("class", "mean")
          .attr("x1", -10)
          .attr("x2", 10)
          .attr("y1", 0)
          .attr("y2", 0)
          .style("stroke", "darkgray")
          .style("stroke-width", "4px")
      );

    return boxplotSelect;
  }
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
